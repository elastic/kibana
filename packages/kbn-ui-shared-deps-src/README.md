# `@kbn/ui-shared-deps-src`

Shared dependencies that must only have a single instance and are built from the repository are installed and re-exported from here. To consume them, import the package and merge the `externals` export into your webpack config so that all references to the supported modules will be remapped to use the global versions.