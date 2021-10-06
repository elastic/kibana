#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0 and the Server Side Public License, v 1; you may not use this file except
# in compliance with, at your election, the Elastic License 2.0 or the Server
# Side Public License, v 1.
#

load("@npm//@bazel/typescript/internal:ts_config.bzl", "TsConfigInfo")
load("@build_bazel_rules_nodejs//:providers.bzl", "run_node", "LinkablePackageInfo")

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

def _pkg_npm_types_impl(ctx):
  # input declarations
  inputs = ctx.files.data[:]
  tsconfig_inputs = _tsconfig_inputs(ctx)
  inputs.extend(tsconfig_inputs)
  inputs.extend([ctx.file._generated_package_json_template])

  # output dir declaration
  package_dir = ctx.actions.declare_directory(ctx.label.name)
  outputs = [package_dir]

  # gathering template args
  template_args = [
    "NAME", ctx.attr.package_name
  ]

  # layout api extractor arguments
  extractor_args = ctx.actions.args()
  package_path = ctx.label.package

  # general args layout
  ## [0] = base output dir
  ## [1] = generated package json template input file path
  ## [2] = stringified template args
  ## [3] = tsconfig input file path
  ## [4] = provided types to summarise entry point
  extractor_args.add(package_dir.path)
  extractor_args.add(ctx.file._generated_package_json_template.path)
  extractor_args.add_joined(template_args, join_with = ",", omit_if_empty = False)
  extractor_args.add(_join(package_path, "tsconfig.json"))
  extractor_args.add_joined([s.path for s in _dts_inputs(package_path, ctx.files.data)], join_with = ",", omit_if_empty = False)
  extractor_args.add_joined([s.path for s in inputs], join_with = ",", omit_if_empty = False)

  run_node(
    ctx,
    inputs = inputs,
    arguments = [extractor_args],
    outputs = outputs,
    mnemonic = "AssembleNpmTypesPackage",
    progress_message = "Assembling npm types package %s" % package_dir.short_path,
    executable = "_packager",
  )

  # this is a tree artifact, so correctly build the return
  package_dir_depset = depset([package_dir])

  return [
    DefaultInfo(
      files = package_dir_depset,
      runfiles = ctx.runfiles([package_dir]),
    ),
    LinkablePackageInfo(
      package_name = ctx.attr.package_name,
      path = package_dir.path,
      files = package_dir_depset,
    )
  ]

pkg_npm_types = rule(
  implementation = _pkg_npm_types_impl,
  attrs = {
    "data": attr.label_list(
      allow_files = True,
    ),
    "package_name": attr.string(),
    "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
    "_packager": attr.label(
      doc = "Target that executes the npm types package assembler binary",
      executable = True,
      cfg = "host",
      default = Label("//src/dev/bazel/pkg_npm_types:_packager"),
    ),
    "_generated_package_json_template": attr.label(
      allow_single_file = True,
      default = "package_json.mustache",
    ),
  },
)
