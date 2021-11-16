# Console

## About

Console provides the user with tools for storing and executing requests against Elasticsearch.

## Features

### `load_from` query parameter

The `load_from` query parameter enables opening Console with prepopulated requests in two ways: from the elastic.co docs and from within other parts of Kibana.

Plugins can open requests in Kibana by assigning this parameter a `data:text/plain` [lz-string](https://pieroxy.net/blog/pages/lz-string/index.html) encoded value. For example, navigating to `/dev_tools#/console?load_from=data:text/plain,OIUQKgBA+gzgpgQwE4GMAWAoA3gIgI4CucSAnjgFy4C2CALulAgDZMVYC+nQA` will prepopulate Console with the following request:

```
GET _search
{"query":{"match_all":{}}}
```

## Architecture
Console uses Ace editor that is wrapped with [`CoreEditor`](https://github.com/elastic/kibana/blob/main/src/plugins/console/public/types/core_editor.ts), so that if needed it can easily be replaced with another editor, for example Monaco.
The autocomplete logic is located in [`autocomplete`](https://github.com/elastic/kibana/blob/main/src/plugins/console/public/lib/autocomplete) folder. Autocomplete rules are computed by classes in `components` sub-folder.

## Autocomplete definitions
Kibana users benefit greatly from autocomplete suggestions since not all Elasticsearch APIs can be provided with a corresponding UI. Autocomplete suggestions improve usability of Console for any Elasticsearch API endpoint.
Autocomplete definitions are all created in the form of javascript objects loaded from `json` and `js` files. 

### Creating definitions
The [`generated`](https://github.com/elastic/kibana/blob/main/src/plugins/console/server/lib/spec_definitions/json/generated) folder contains definitions created automatically from Elasticsearch REST API specifications. See this [README](https://github.com/elastic/kibana/blob/main/packages/kbn-spec-to-console/README.md) file for more information on the `spec-to-console` script. 

Manually created override files in the [`overrides`](https://github.com/elastic/kibana/blob/main/src/plugins/console/server/lib/spec_definitions/json/overrides) folder contain fixes for generated files and additions for request body parameters.   

### Top level keys
Use following top level keys in the definitions objects.

#### `documentation`
Url to Elasticsearch REST API documentation for the endpoint (If the url contains `master` or `current` strings in the path, Console automatically replaces them with the `docLinkVersion` to always redirect the user to the correct version of the documentation).

#### `methods`
Allowed http methods (`GET`, `POST` etc)

#### `patterns`
Array of API endpoints that contain variables like `{indices}` or `{fields}`. For example, `{indices}/_rollup/{rollup_index}`. See the [Variables](#variables) section below for more info.

#### `url_params`
Query url parameters and their values. See the [Query url parameters](#query-url-parameters) section below for more info. An example: 
```json
{
  "url_params": {
    "format": "",
    "local": "__flag__",
    "h": [],
    "expand_wildcards": [
      "open",
      "closed",
      "hidden",
      "none",
      "all"
    ]
  }
}
```

#### `priority`
Value for selecting one autocomplete definition, if several configurations are loaded from the files. The highest number takes precedence.

#### `data_autocomplete_rules`
Request body parameters and their values. Only used in `overrides` files because REST API specs don't contain any information about body request parameters.
Refer to Elasticsearch REST API documentation when configuring this object. See the [Request body parameters](#request-body-parameters) section below for more info. An example:
```json
{
  "data_autocomplete_rules": {
    "text": [],
    "field": "{field}",
    "analyzer": "",
    "explain": { "__one_of": [false, true] }
  }
}
```

### Query url parameters
Query url parameters are configured in form of an object, for example: 
```json
{
  "url_params": {
    "local": "__flag__",
    "scroll": "",
    "expand_wildcards": [
      "open",
      "closed",
      "hidden",
      "none",
      "all"
    ]
  }
} 
```
This object specifies 3 query parameters: `local` (boolean value), `scroll` (no default value) and `expand_wildcards` (with a list of accepted values).  

When the user types in the url path into Console and at least 2 characters after `?`, all matching url parameters are displayed as autocomplete suggestions. In this example, after typing 
```
GET /_some_endpoint?ca
```
"local" and "expand_wildcards" are displayed as suggestions.
When the user types at least 2 characters after `=`, all matching values for this parameter are displayed as autocomplete suggestions. In this example, after typing 
```
GET /_some_endpoint?expand_wildcards=hi
```
"hidden" is displayed for autocompletion. 

Variables such as `{indices}` or `{fields}` are accepted both as an url parameter and its value in the configuration object. See the [Variables](#variables) section below for more information.

### Request body parameters
Request body parameters are configured in form of an object, for example: 
```json
{
  "data_autocomplete_rules": {
    "index_patterns": [],
    "mappings": { "__scope_link": "put_mapping" },
    "version": 0,
    "aliases": {
      "__template": {
        "NAME": {}
      }
    }
  }
}
```
Object's keys are parameters that will be displayed as autocomplete suggestions when the user starts typing request body. In this example, after typing 
```
PUT /_some_endpoint
{
  "
```
"index_patterns", "mappings", "version" and "aliases" are displayed as autocomplete suggestions. 
Object's values provide default or accepted values of request body parameters. For example, if "version" is selected from the suggestions list, value `0` is automatically filled, resulting in the following request: 
```
PUT /_some_endpoint
{
  "version": 0
}
```
Object's values can contain objects for nested configuration because the engine can work recursively while searching for autocomplete suggestions. 

Following values can be used in the configuration object: 
#### One value from the list (`__one_of: [..., ...]`)
Use this configuration for a parameter with a list of allowed values, for example types of snapshot repository: 
```
"type": {"__one_of": ["fs", "url", "s3", "hdfs", "azure"]}
```
The first value in the list will be automatically filled as parameter value. For example, when "type" is selected from the suggestions list, the request body is autofilled as following:
```
PUT /_some_endpoint
{
  "type": "fs"
} 
```
But if the value `fs` is deleted, all suggestions will be displayed: "fs", "url", "s3", "hdfs" and "azure". 
Use `__one_of: [true, false]` for boolean values.

#### Array of values (`[..., ... ]` or `__any_of: [..., ...]`)
Use this configuration for parameters which accept an array of values, for example actions parameter: 
```
"actions": { "__any_of": [ "add", "remove"]}
```
When "actions" is selected from the suggestions list, it will be autocompleted with an empty array: 
```
POST /_some_endpoint
{
  "actions": []
}
```
All values in the array are displayed as suggestions for parameter values inside the array.


#### Default object structure (`__template: {...}`)
Use this configuration to insert an object with default values into the request body when the corresponding key is typed in. 
For example, in this configuration 
```json
{
  "terms": {
    "__template": {
      "field": "",
      "size": 10
    },
    "field": "{field}",
    "size": 10,
    "shard_size": 10,
    "min_doc_count": 10
  }
}
```
the `terms` parameter has several properties, but only `field` and `size` are autocompleted in the request body when "terms" is selected from the suggestions list. 
```
POST /_some_endpoint
{
  terms: {
    field: '',
    size: 10,
  }
}
```
The rest of the properties are displayed as autocomplete suggestions, when the `terms` object is being edited.

#### Scope link (`__scope_link`)
Use this type to copy a configuration object specified in a different endpoint definition. For example, the `put_settings` endpoint definition contains a configuration object that can be reused for `settings` parameter in a different endpoint: 
```json
{
  "data_autocomplete_rules": {
    "settings": {
      "__scope_link": "put_settings"
    }
  }
}
```
#### Global scope (`GLOBAL`)
Use `GLOBAL` keyword with `__scope_link` to refer to a reusable set of definitions created in the [`globals`](https://github.com/elastic/kibana/blob/main/src/plugins/console/server/lib/spec_definitions/js/globals.ts) file.
For example: 
```json
{
  "data_autocomplete_rules": {
    "query": {
      "__scope_link": "GLOBAL.query"
    }
  }
}
```
#### Conditional definition (`__condition: { lines_regex: ... }`)
To provide a different set of autocomplete suggestions based on the value configured in the request. For example, when creating a snapshot repository of different types (`fs`, `url` etc) different properties are displayed in the suggestions list based on the type. See [snapshot.create_repository.json](https://github.com/elastic/kibana/blob/main/src/plugins/console/server/lib/spec_definitions/json/overrides/snapshot.create_repository.json) for an example.


### Variables
Some autocomplete definitions need to be configured with dynamic values that can't be hard coded into a json or js file, for example a list of indices in the cluster. 
A list of variables is defined in the  `parametrizedComponentFactories` function in [`kb.js`](https://github.com/elastic/kibana/blob/main/src/plugins/console/public/lib/kb/kb.js) file. The values of these variables are assigned dynamically for every cluster. 
Use these variables with curly braces, for example `{indices}`, `{types}`, `{id}`, `{username}`, `{template}`, `{nodes}` etc.

