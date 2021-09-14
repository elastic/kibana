# @kbn/ace

This package contains the XJSON mode for brace. This is an extension of the `brace/mode/json` mode.

This package also contains an import of the entire brace editor which is used for creating the custom XJSON worker.

## Note to plugins
_This code should not be eagerly loaded_.

Make sure imports of this package are behind a lazy-load `import()` statement.

Your plugin should already be loading application code this way in the `mount` function.

## Deprecated

This package is considered deprecated and will be removed in future.

New and existing editor functionality should use Monaco.

_Do not add new functionality to this package_. Build new functionality for Monaco and use it instead.
