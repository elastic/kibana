#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0 and the Server Side Public License, v 1; you may not use this file except
# in compliance with, at your election, the Elastic License 2.0 or the Server
# Side Public License, v 1.
#

load("@build_bazel_rules_nodejs//:providers.bzl", "run_node")
#load("@build_bazel_rules_nodejs//internal/node:node.bzl", "nodejs_binary")
#load("@npm//typescript:index.bzl", "tsc")

def _join(*elements):
  segments = [f for f in elements if f]
  if len(segments):
    return "/".join(segments)
  return "."

def _types_pkg_impl(ctx):
  out = ctx.actions.declare_file(_join(ctx.label.name, "package.json"))
#  out = ctx.actions.declare_file("package.json")
  inputs = ctx.files.data[:]

  ctx.actions.expand_template(
    output = out,
    template = ctx.file._template,
    substitutions = {"{NAME}": ctx.attr.package_name},
  )

  outputs = []
  outputs.append(out)
#  # outputs.append(ctx.actions.declare_file(ctx.label.name + "index.d.ts"))
#  js_out = ctx.actions.declare_directory("%s" % ctx.attr.name)
#  outputs.append(js_out)
#
#  extractor_args = ctx.actions.args()
#  extractor_args.add_all([
#    ctx.expand_location("tsconfig.json"),
#    ctx.expand_location("index.d.ts"),
#    "index.d.ts"
#  ])
#
#  ctx.actions.run(
#    progress_message = "Running API Extractor",
#    mnemonic = "APIExtractor",
#    executable = ctx.executable._api_extractor,
#    inputs = inputs,
#    outputs = outputs,
#    arguments = [extractor_args],
#  )

  # run_node(
  #   ctx,
  #   inputs = inputs,
  #   arguments = [extractor_args],
  #   outputs = outputs,
  #   mnemonic = "ApiExtractor",
  #   executable = "_api_extractor"
  #   execution_requirements = {},
  # )

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
  },
)
