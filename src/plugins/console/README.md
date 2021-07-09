# Console

## About

Console provides the user with tools for storing and executing requests against Elasticsearch.

## Architecture
- Ace editor wrapped with `<KIBANA_REPO>/src/plugins/console/public/types/core_editor.ts`. This wrapper allows for an easier change of the editor, for example from Ace to Monaco.
- Autocomplete logic in `<KIBANA_REPO>/src/plugins/console/public/lib/autocomplete`. Autocomplete rules are computed by classes in `components` folder.

## Autocomplete definitions
Users benefit greatly from autocomplete suggestions since not all Elasticsearch APIs can be provided with a corresponding UI. The autocomplete definitions are all created in the form of javascript objects loaded from `json` or `js` files. 

### Creating definitions
The folder `<KIBANA_REPO>/src/plugins/console/server/lib/spec_definitions/json/generated` contains definitions generated automatically from Elasticsearch REST API specifications. See `<KIBANA_REPO>/packages/kbn-spec-to-console/README.md` for more information on the `spec-to-console` script. 

Manually created override files in the folder `<KIBANA_REPO>/src/plugins/console/server/lib/spec_definitions/json/overrides` contain fixes for generated files and additions for body request parameters.   

### Top level keys
Following top level keys are used in the definitions objects:

- `documentation`: string for the docs url link, `master` and `current` strings in the url are replaced with the `docLinkVersion`
- `methods`: array of strings for allowed http methods
- `patterns`: array of strings for url endpoints, accept parameters like `{indices}`, `{fields}` etc
- `url_params`: an object with possible keys for url parameters and its values
- `priority`: a number to decide when there are several possible autocomplete definitions
- `data_autocomplete_rules`: an object with possible keys for body request and its values

### Url parameters
When defining url parameters or body request parameters, each key in the object is a possible url parameter or a possible field in the body request. Parameters like `{indices}`, `{fields}` etc are accepted both as a key and a value.

- `__flag__`: is used for boolean params, suggestions contain `true` and `false`
- array with a list of values: is used for a list of known accepted param values, suggestions contain all values in the list

### Body request params:
- `__one_of: [..., ...]`: is used for a list of known accepted param values, autocompletes as the first value of the array, suggestions contain all values in the list
- `__one_of: [true, false]`: is used for boolean body request params
- `__any_of: [..., ...]`: is used for a list of known accepted param values, autocompletes with an empty array, suggestions contain all values in the list
- array with a list of values: is the same as `__any_of: [..., ...]`
- `__template: {...}`: is an object to be inserted as an autocomplete suggestion when the corresponding key is typed in, contains defaults to be used in the body request
- `__scope_link`: is used to reuse a definition defined elsewhere. For example in the following snippet, the endpoint will reuse the definition for the body request param settings defined in the endpoint `put_settings`.

```
"data_autocomplete_rules": {
  "settings": {
    "__scope_link": "put_settings"
  }...
```
- `GLOBAL` scope is used with `__scope_link` to refer to a reusable set of definitions created in the file `<KIBANA_REPO>/src/plugins/console/server/lib/spec_definitions/js/globals.ts`
- `__condition: { lines_regex: ... }` is used to provide a different set of autocomplete suggestions based on the value configured in the request. An example is creating a snapshot repository of different types (`fs`, `url` etc) and suggesting different params based on the type (`<KIBANA_REPO>/src/plugins/console/server/lib/spec_definitions/json/overrides/snapshot.create_repository.json`)


### Parameters
These values are filled in at runtime and can be used with curly braces to be evaluated at runtime. For the complete list of parameters check `parametrizedComponentFactories` function in `<KIBANA_REPO>/src/plugins/console/public/lib/kb/kb.js`. Examples include `{indices}`, `{types}`, `{id}`, `{username}`, `{template}`, `{nodes}` etc.


