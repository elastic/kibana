"Simple wrapper over the general pkg_npm rule from rules_nodejs so we can override some configs"

load("@build_bazel_rules_nodejs//internal/pkg_npm:pkg_npm.bzl", _pkg_npm = "pkg_npm_macro")

def pkg_npm(validate = False, **kwargs):
  """A macro around the upstream pkg_npm rule.

  Args:
    validate: boolean; Whether to check that the attributes match the package.json. Defaults to false
    **kwargs: the rest
  """

  _pkg_npm(
    validate = validate,
    **kwargs
  )
