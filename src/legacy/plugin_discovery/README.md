# Plugin Discovery

The plugin discovery module defines the core plugin loading logic used by the Kibana server. It exports functions for


## `findPluginSpecs(settings, [config])`

Finds [`PluginSpec`][PluginSpec] objects

### params
 - `settings`: the same settings object accepted by [`KbnServer`][KbnServer]
 - `[config]`: Optional - a [`Config`][Config] service. Using this param causes `findPluginSpecs()` to modify `config`'s schema to support the configuration for each discovered [`PluginSpec`][PluginSpec]. If you can, please use the [`Config`][Config] service produced by `extendedConfig$` rather than passing in an existing service so that `findPluginSpecs()` is side-effect free.

### return value

`findPluginSpecs()` returns an object of Observables which produce values at different parts of the process. Since the Observables are all aware of their own dependencies you can subscribe to any combination (within the same tick) and only the necessary plugin logic will be executed.

If you *never* subscribe to any of the Observables then plugin discovery won't actually run.

 - `pack$`: emits every [`PluginPack`][PluginPack] found
 - `invalidDirectoryError$: Observable<Error>`: emits [`InvalidDirectoryError`][Errors]s caused by `settings.plugins.scanDirs` values that don't point to actual directories. `findPluginSpecs()` will not abort when this error is encountered.
 - `invalidPackError$: Observable<Error>`: emits [`InvalidPackError`][Errors]s caused by children of `settings.plugins.scanDirs` or `settings.plugins.paths` values which don't meet the requirements of a [`PluginPack`][PluginPack] (probably missing a `package.json`). `findPluginSpecs()` will not abort when this error is encountered.
 - `deprecation$: Observable<string>`: emits deprecation warnings that are produces when reading each [`PluginPack`][PluginPack]'s configuration
 - `extendedConfig$: Observable<Config>`: emits the [`Config`][Config] service that was passed to `findPluginSpecs()` (or created internally if none was passed) after it has been extended with the configuration from each plugin
 - `spec$: Observable<PluginSpec>`: emits every *enabled* [`PluginSpec`][PluginSpec] defined by the discovered [`PluginPack`][PluginPack]s
 - `disabledSpec$: Observable<PluginSpec>`: emits every *disabled* [`PluginSpec`][PluginSpec] defined by the discovered [`PluginPack`][PluginPack]s
 - `invalidVersionSpec$: Observable<PluginSpec>`: emits every [`PluginSpec`][PluginSpec] who's required kibana version does not match the version exposed by `config.get('pkg.version')`

### example

Just get the plugin specs, only fail if there is an uncaught error of some sort:
```js
const { pack$ } = findPluginSpecs(settings);
const packs = await pack$.pipe(toArray()).toPromise()
```

Just log the deprecation messages:
```js
const { deprecation$ } = findPluginSpecs(settings);
for (const warning of await deprecation$.pipe(toArray()).toPromise()) {
  console.log('DEPRECATION:', warning)
}
```

Get the packs but fail if any packs are invalid:
```js
const { pack$, invalidDirectoryError$ } = findPluginSpecs(settings);
const packs = await Rx.merge(
  pack$.pipe(toArray()),

  // if we ever get an InvalidDirectoryError, throw it
  // into the stream so that all streams are unsubscribed,
  // the discovery process is aborted, and the promise rejects
  invalidDirectoryError$.pipe(
    map(error => { throw error })
  ),
).toPromise()
```

Handle everything
```js
const {
  pack$,
  invalidDirectoryError$,
  invalidPackError$,
  deprecation$,
  extendedConfig$,
  spec$,
  disabledSpecs$,
  invalidVersionSpec$,
} = findPluginSpecs(settings);

Rx.merge(
  pack$.pipe(
    tap(pluginPack => console.log('Found plugin pack', pluginPack))
  ),

  invalidDirectoryError$.pipe(
    tap(error => console.log('Invalid directory error', error))
  ),

  invalidPackError$.pipe(
    tap(error => console.log('Invalid plugin pack error', error))
  ),

  deprecation$.pipe(
    tap(msg => console.log('DEPRECATION:', msg))
  ),

  extendedConfig$.pipe(
    tap(config => console.log('config service extended by plugins', config))
  ),

  spec$.pipe(
    tap(pluginSpec => console.log('enabled plugin spec found', spec))
  ),

  disabledSpec$.pipe(
    tap(pluginSpec => console.log('disabled plugin spec found', spec))
  ),

  invalidVersionSpec$.pipe(
    tap(pluginSpec => console.log('plugin spec with invalid version found', spec))
  ),
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

## `new PluginPack(options)` class

Only exported so that `PluginPack` instances can be created in tests and used in place of on-disk plugin fixtures. Use `findPluginSpecs()`, or the cached result of a call to `findPluginSpecs()` (like `kbnServer.pluginSpecs`) any time you might need access to `PluginPack` objects in distributed code.

### params

 - `options.path`: absolute path to where this plugin pack was found, this is normally a direct child of `./src/legacy/core_plugins` or `./plugins`
 - `options.pkg`: the parsed `package.json` for this pack, used for defaults in `PluginSpec` objects defined by this pack
 - `options.provider`: the default export of the pack, a function which is called with the `PluginSpec` class which should return one or more `PluginSpec` objects.

[PluginPack]: ./plugin_pack/plugin_pack.js "PluginPath class definition"
[PluginSpec]: ./plugin_spec/plugin_spec.js "PluginSpec class definition"
[Errors]: ./errors.js "PluginDiscover specific error types"
[KbnServer]: ../server/kbn_server.js "KbnServer class definition"
[Config]: ../server/config/config.js "KbnServer/Config class definition"
