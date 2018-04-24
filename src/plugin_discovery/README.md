# Plugin Discovery

The plugin discovery module defines the core plugin loading logic used by the Kibana server.


## `findPluginSpecs(settings, [config])`

Finds [`PluginSpec`][PluginSpec] objects

### params
 - `settings`: the same settings object accepted by [`KbnServer`][KbnServer]
 - `[config]`: Optional - a [`Config`][Config] service. Using this param causes `findPluginSpecs()` to modify `config`'s schema to support the configuration for each discovered [`PluginSpec`][PluginSpec]. If you can, please use the [`Config`][Config] service produced by `extendedConfig$` rather than passing in an existing service so that `findPluginSpecs()` is side-effect free.

### return value

`findPluginSpecs()` returns an object of Observables which produce values at different parts of the process. Since the Observables are all aware of their own dependencies you can subscribe to any combination (within the same tick) and only the necessary plugin logic will be executed.

If you *never* subscribe to any of the Observables then plugin discovery won't actually run.

 - `invalidDirectoryError$: Observable<Error>`: emits [`InvalidDirectoryError`][Errors]s caused by `settings.plugins.scanDirs` values that don't point to actual directories. `findPluginSpecs()` will not abort when this error is encountered.
 - `deprecation$: Observable<string>`: emits deprecation warnings that are produces when reading each [`PluginPack`][PluginPack]'s configuration
 - `extendedConfig$: Observable<Config>`: emits the [`Config`][Config] service that was passed to `findPluginSpecs()` (or created internally if none was passed) after it has been extended with the configuration from each plugin
 - `spec$: Observable<PluginSpec>`: emits every *enabled* [`PluginSpec`][PluginSpec] defined by the discovered [`PluginPack`][PluginPack]s
 - `disabledSpec$: Observable<PluginSpec>`: emits every *disabled* [`PluginSpec`][PluginSpec] defined by the discovered [`PluginPack`][PluginPack]s
 - `invalidVersionSpec$: Observable<PluginSpec>`: emits every [`PluginSpec`][PluginSpec] who's required kibana version does not match the version exposed by `config.get('pkg.version')`

### example

Just get the plugin specs, only fail if there is an uncaught error of some sort:
```js
const { pack$ } = findPluginSpecs(settings);
const packs = await pack$.toArray().toPromise()
```

Just log the deprecation messages:
```js
const { deprecation$ } = findPluginSpecs(settings);
for (const warning of await deprecation$.toArray().toPromise()) {
  console.log('DEPRECATION:', warning)
}
```

Handle everything
```js
const {
  invalidDirectoryError$,
  deprecation$,
  extendedConfig$,
  spec$,
  disabledSpecs$,
  invalidVersionSpec$,
} = findPluginSpecs(settings);

Observable.merge(
  invalidDirectoryError$
    .do(error => console.log('Invalid directory error', error)),

  deprecation$
    .do(msg => console.log('DEPRECATION:', msg)),

  extendedConfig$
    .do(config => console.log('config service extended by plugins', config)),

  spec$
    .do(pluginSpec => console.log('enabled plugin spec found', spec)),

  disabledSpec$
    .do(pluginSpec => console.log('disabled plugin spec found', spec)),

  invalidVersionSpec$
    .do(pluginSpec => console.log('plugin spec with invalid version found', spec)),
)
.toPromise()
.then(() => {
  console.log('plugin discovery complete')
})
.catch((error) => {
  console.log('plugin discovery failed', error)
})

```

## `reduceExportSpecs(pluginSpecs, reducers, [defaults={}])`

Reduces every value exported by the [`PluginSpec`][PluginSpec]s to produce a single value. If an exported value is an array each item in the array will be reduced individually. If the exported value is `undefined` it will be ignored. The reducer is called with the signature:

```js
reducer(
  // the result of the previous reducer call, or `defaults`
  acc: any,
  // the exported value, found at `uiExports[type]` or `uiExports[type][i]`
  // in the PluginSpec config.
  spec: any,
  // the key in `uiExports` where this export was found
  type: string,
  // the PluginSpec which exported this spec
  pluginSpec: PluginSpec
)
```
