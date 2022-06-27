"Simple wrapper over the general ts_project rule from rules_nodejs so we can override some configs"

load("@npm//@bazel/typescript:index.bzl", _ts_project = "ts_project")

def ts_project(validate = False, **kwargs):
  """A macro around the upstream ts_project rule.

  Args:
    validate: boolean; whether to check that the tsconfig JSON settings match the attributes on this target. Defaults to false
    **kwargs: the rest
  """

  _ts_project(
    validate = validate,
    **kwargs
  )
