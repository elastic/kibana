## Common dictionary
Plugin - a piece of software expressing specific subject of the business unit within the code.

Platform - a set of plugins required to run all other Kibana plugins.

## New platform principles
### Explicit business domains separation
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
### Explicit dependencies
Each plugin should declare dependencies on the other plugins explicitly. Plugins cannot have circular dependencies. Plugins shouldn't have hidden dependencies.
```json
"requiredPlugins": ["b"],
"optionalPlugins": ["c"],
```
### Explicit API declaration
Each plugins defines API & extension points explicitly. Any other API that not declared explicitly as public should be considered private. HTTP endpoints belonging to other plugins are considered private. Plugins should expose JavaScript interfaces on top of these HTTP endpoints for other plugins to consume.
```js
// GOOD
deps.plugin.getData();
// BAD.
`GET /api/plugin/data`
```
### Encapsulated state
Each plugin encapsulates its internal state. It doesn't rely on any kind of global state. Plugins provide an internal state via explicit API, reflecting the dynamic nature of the state (an event bus, observables, getter/setter functions). A plugin can change other plugin state by calling its public API method.
```js
// GOOD
deps.plugin.getData();
deps.plugin.data$.subscribe();
deps.plugin.setAddress('...');
// BAD.
deps.plugin._data;
deps.plugin.data = '...';
```
