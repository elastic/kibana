# `@kbn/ui-shared-deps-npm`

Shared dependencies that must only have a single instance and also come from NPM are installed and re-exported from here. To consume them, import the package and merge the `externals` export into your webpack config so that all references to the supported modules will be remapped to use the global versions.