## Common dictionary
Plugin - TODO
Platform - TODO

## New platform principles
### Explicit business domains separation.
The plugins code should be structured on the top level to reflect business units.
```js
// GOOD
src/plugins
 - apm
  - server
  - public
 - search
 ..
// BAD
src/plugins
 - server
  - apm
  - search
```
### Explicit dependencies.
Each plugin should declare dependencies explicitly. Plugins cannot have circular dependencies. Plugins shouldn't have hidden dependencies.
```json
"requiredPlugins": ["b"],
"optionalPlugins": ["c"],
```
### Explicit API declaration.
Each plugins defines API & extension points explicitly. Any other API isn't declared explicitly as public, should be considered private.
```js
// GOOD
deps.plugin.getData();
// BAD.
`GET /api/plugin/data`
```
### Encapsulated state
Each plugin encapsulates its internal state. It doesn't rely on any kind of global state. Plugins provide an internal state via explicit API, reflecting the dynamic nature of the state (event bus, observables, getter/setter functions). A plugin can change any other plugin state calling its public API method.
```js
// GOOD
deps.plugin.getData();
deps.plugin.data$.subscribe();
deps.plugin.setAddress('...');
// BAD.
deps.plugin._data;
deps.plugin.data = '...';
```
