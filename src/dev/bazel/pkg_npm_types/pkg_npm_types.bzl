#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0 and the Server Side Public License, v 1; you may not use this file except
# in compliance with, at your election, the Elastic License 2.0 or the Server
# Side Public License, v 1.
#

load("@npm//@bazel/typescript/internal:ts_config.bzl", "TsConfigInfo")
load("@build_bazel_rules_nodejs//:providers.bzl", "run_node", "LinkablePackageInfo", "declaration_info")
load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect")


#### TODO
# Implement a way to produce source maps for api extractor
# summarised types as referenced at (https://github.com/microsoft/rushstack/issues/1886#issuecomment-933997910)

def _deps_inputs(ctx):
  """Returns all transitively referenced files on deps """
  deps_files_depsets = []
  for dep in ctx.attr.deps:
    # Collect whatever is in the "data"
    deps_files_depsets.append(dep.data_runfiles.files)

    # Only collect DefaultInfo files (not transitive)
    deps_files_depsets.append(dep.files)

  deps_files = depset(transitive = deps_files_depsets).to_list()
  return deps_files

def _calculate_entrypoint_path(ctx):
  return _join(ctx.bin_dir.path, ctx.label.package, _get_types_outdir_name(ctx), ctx.attr.entrypoint_name)

def _get_types_outdir_name(ctx):
  base_out_folder = _join(ctx.bin_dir.path, ctx.label.package)
  type_dep_path = ctx.files.deps[0].path
  type_dep_path_without_base_out = type_dep_path.replace(base_out_folder + "/", "", 1)
  types_outdir_name = type_dep_path_without_base_out.split("/")[0]
  return types_outdir_name

def _join(*elements):
  segments = [f for f in elements if f]
  if len(segments):
    return "/".join(segments)
  return "."

def _tsconfig_inputs(ctx):
  """Returns all transitively referenced tsconfig files from "tsconfig" """
  all_inputs = []
  if TsConfigInfo in ctx.attr.tsconfig:
    all_inputs.extend(ctx.attr.tsconfig[TsConfigInfo].deps)
  else:
    all_inputs.append(ctx.file.tsconfig)
  return all_inputs

def _pkg_npm_types_impl(ctx):
  # input declarations
  deps_inputs = _deps_inputs(ctx)
  tsconfig_inputs = _tsconfig_inputs(ctx)
  inputs = ctx.files.srcs[:]
  inputs.extend(tsconfig_inputs)
  inputs.extend(deps_inputs)
  inputs.append(ctx.file._generated_package_json_template)

  # output dir declaration
  package_path = ctx.label.package
  package_dir = ctx.actions.declare_directory(ctx.label.name)
  outputs = [package_dir]

  # gathering template args
  template_args = [
    "NAME", ctx.attr.package_name
  ]

  # layout api extractor arguments
  extractor_args = ctx.actions.args()

  ## general args layout
  ### [0] = base output dir
  ### [1] = generated package json template input file path
  ### [2] = stringified template args
  ### [3] = tsconfig input file path
  ### [4] = entry point from provided types to summarise
  extractor_args.add(package_dir.path)
  extractor_args.add(ctx.file._generated_package_json_template.path)
  extractor_args.add_joined(template_args, join_with = ",", omit_if_empty = False)
  extractor_args.add(tsconfig_inputs[0])
  extractor_args.add(_calculate_entrypoint_path(ctx))

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
    declaration_info(
      declarations = depset([package_dir])
    ),
    LinkablePackageInfo(
      package_name = ctx.attr.package_name,
      package_path = "",
      path = package_dir.path,
      files = package_dir_depset,
    )
  ]

pkg_npm_types = rule(
  implementation = _pkg_npm_types_impl,
  attrs = {
    "deps": attr.label_list(
      doc = """Other targets which are the base types to summarise from""",
      allow_files = True,
      aspects = [module_mappings_aspect],
    ),
    "entrypoint_name": attr.string(
      doc = """Entrypoint name of the types files group to summarise""",
      default = "index.d.ts",
    ),
    "package_name": attr.string(),
    "srcs": attr.label_list(
      doc = """Files inside this directory which are inputs for the types to summarise.""",
      allow_files = True,
    ),
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
