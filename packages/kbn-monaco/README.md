# @kbn/monaco

A customized version of monaco that is automatically configured the way we want it to be when imported as `@kbn/monaco`. Additionally, imports to this package are automatically shared with all plugins using `@kbn/ui-shared-deps`.

Includes custom xjson language support. The `es_ui_shared` plugin has an example of how to use it, in the future we will likely expose helpers from this package to make using it everywhere a little more seamless.