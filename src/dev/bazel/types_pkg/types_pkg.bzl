#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0 and the Server Side Public License, v 1; you may not use this file except
# in compliance with, at your election, the Elastic License 2.0 or the Server
# Side Public License, v 1.
#

load("@npm//@bazel/typescript/internal:ts_config.bzl", "TsConfigInfo")
load("@build_bazel_rules_nodejs//:providers.bzl", "run_node")

def _tsconfig_inputs(ctx):
  """Returns all transitively referenced tsconfig files from "tsconfig" """
  inputs = []
  if TsConfigInfo in ctx.attr.tsconfig:
    inputs.extend(ctx.attr.tsconfig[TsConfigInfo].deps)
  else:
    inputs.append(ctx.file.tsconfig)
  return inputs

def _join(*elements):
  segments = [f for f in elements if f]
  if len(segments):
    return "/".join(segments)
  return "."

def _dts_inputs(pkg_path, files):
  return [f for f in files if f.path.endswith(_join(pkg_path, "target_types", "index.d.ts")) and not f.path.endswith(".map")]

def _types_pkg_impl(ctx):
  inputs = ctx.files.data[:]
  tsconfig_inputs = _tsconfig_inputs(ctx)
  inputs.extend(tsconfig_inputs)
  package_json_output = ctx.actions.declare_file(_join(ctx.label.name, "package.json"))
  outputs = [package_json_output]

  ctx.actions.expand_template(
    output = package_json_output,
    template = ctx.file._template,
    substitutions = {"{NAME}": ctx.attr.package_name},
  )

  api_extracted_output = ctx.actions.declare_file(_join(ctx.label.name, "index.d.ts"))
  outputs.append(api_extracted_output)

  extractor_args = ctx.actions.args()
  package_path = ctx.label.package

  extractor_args.add(_join(package_path, "tsconfig.json"))
  extractor_args.add_joined([s.path for s in _dts_inputs(package_path, ctx.files.data)], join_with = ",", omit_if_empty = False)
  extractor_args.add(api_extracted_output.path)
  extractor_args.add_joined([s.path for s in inputs], join_with = ",", omit_if_empty = False)

  run_node(
    ctx,
    inputs = inputs,
    arguments = [extractor_args],
    outputs = [api_extracted_output],
    mnemonic = "ApiExtractor",
    executable = "_api_extractor",
    execution_requirements = {},
  )

  return [DefaultInfo(files = depset(outputs))]

types_pkg = rule(
  implementation = _types_pkg_impl,
  attrs = {
    "package_name": attr.string(),
    "_template": attr.label(
      allow_single_file = True,
      default = "package_json.tpl",
    ),
    "data": attr.label_list(
      allow_files = True,
    ),
    "_api_extractor": attr.label(
      doc = "Target that executes the api-extractor binary",
      executable = True,
      cfg = "host",
      default = Label("//src/dev/bazel/types_pkg:api_extractor"),
    ),
    "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
  },
)
