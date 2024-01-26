"Simple wrapper over the general ts_project rule from rules_nodejs so we can override some configs"

load("@npm//@bazel/typescript:index.bzl", _ts_project = "ts_project")

def contains(list, item):
  for i in list:
    if i == item:
      return True
  return False

def ts_project(validate = False, deps = [], **kwargs):
  """A macro around the upstream ts_project rule.

  Args:
    validate: boolean; whether to check that the tsconfig JSON settings match the attributes on this target. Defaults to false
    **kwargs: the rest
  """

  if contains(deps, "@npm//tslib") == False:
    deps = deps + ["@npm//tslib"]

  _ts_project(
    validate = validate,
    deps = deps,
    **kwargs
  )
