# UI Exports

When defining a Plugin, the `uiExports` key can be used to define a map of export types to values that will be used to configure the UI system. A common use for `uiExports` is `uiExports.app`, which defines the configuration of a [`UiApp`][UiApp] and teaches the UI System how to render, bundle and tell the user about an application.


## `collectUiExports(pluginSpecs): { [type: string]: any }`

This function produces the object commonly found at `kbnServer.uiExports`. This object is created by calling `collectPluginExports()` with a standard set of export type reducers and defaults for the UI System.

### export type reducers

The [`ui_export_types` module][UiExportTypes] defines the reducer used for each uiExports key (or `type`). The name of every export in [./ui_export_types/index.js][UiExportTypes] is a key that plugins can define in their `uiExports` specification and the value of those exports are reducers that `collectPluginExports()` will call to produce the merged result of all export specs.

### example - UiApps

Plugin authors can define a new UiApp in their plugin specification like so:

```js
// a single app export
export default function (kibana) {
  return new kibana.Plugin({
    //...
    uiExports: {
      app: {
        // uiApp spec options go here
      }
    }
  })
}

// apps can also export multiple apps
export default function (kibana) {
  return new kibana.Plugin({
    //...
    uiExports: {
      apps: [
        { /* uiApp spec options */ },
        { /* second uiApp spec options */ },
      ]
    }
  })
}
```

To handle this export type, the [ui_export_types][UiExportTypes] module exports two reducers, one named `app` and the other `apps`.

```js
export const app = ...
export const apps = ...
```

These reducers are defined in [`ui_export_types/ui_apps`][UiAppExportType] and have the exact same definition:

```js
// `wrap()` produces a reducer by wrapping a base reducer with modifiers.
// All but the last argument are modifiers that take a reducer and return
// an alternate reducer to use in it's place.
// 
// Most wrappers call their target reducer with slightly different
// arguments. This allows composing standard reducer modifications for
// reuse, consistency, and easy reference (once you get the hang of it).
wrap(
  // calls the next reducer with the `type` set to `uiAppSpecs`, ignoring
  // the key the plugin author used to define this spec ("app" or "apps"
  // in this example)
  alias('uiAppSpecs'),
  
  // calls the next reducer with the `spec` set to the result of calling
  // `applySpecDefaults(spec, type, pluginSpec)` which merges some defaults
  // from the `PluginSpec` because we want uiAppSpecs to be useful individually
  mapSpec(applySpecDefaults),
  
  // writes this spec to `acc[type]` (`acc.uiAppSpecs` in this example since
  // the type was set to `uiAppSpecs` by `alias()`). It does this by concatenating
  // the current value and the spec into an array. If either item is already
  // an array its items are added to the result individually. If either item
  // is undefined it is ignored.
  // 
  // NOTE: since flatConcatAtType is last it isn't a wrapper, it's
  // just a normal reducer
  flatConcatAtType
)
```

This reducer format was chosen so that it will be easier to look back at these reducers and see that `app` and `apps` export specs are written to `kbnServer.uiExports.uiAppSpecs`, with defaults applied, in an array.

### defaults

The [`ui_exports/ui_export_defaults`][UiExportDefaults] module defines the default shape of the uiExports object produced by `collectUiExports()`. The defaults generally describe the `uiExports` from the UI System itself, like default visTypes and such.

[UiApp]: ../ui_apps/ui_app.js "UiApp class definition"
[UiExportDefaults]: ./ui_export_defaults.js "uiExport defaults definition"
[UiExportTypes]: ./ui_export_types/index.js "Index of default ui_export_types module"
[UiAppExportType]: ./ui_export_types/ui_apps.js "UiApp extension type definition"
[PluginSpec]: ../../plugin_discovery/plugin_spec/plugin_spec.js "PluginSpec class definition"
[PluginDiscovery]: '../../plugin_discovery' "plugin_discovery module"