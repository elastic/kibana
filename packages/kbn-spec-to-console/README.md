A mini utility to convert [Elasticsearch's REST spec](https://github.com/elastic/elasticsearch/blob/master/rest-api-spec) to Console's (Kibana) autocomplete format.


It is used to semi-manually update Console's autocompletion rules.

### Retrieving the spec

If you don't have a copy of the Elasticsearch repo on your machine, follow these steps to clone only the rest API specs

```
mkdir es-spec && cd es-spec
git init
git remote add origin https://github.com/elastic/elasticsearch
git config core.sparsecheckout true
echo "rest-api-spec/src/main/resources/rest-api-spec/api/*\nx-pack/plugin/src/test/resources/rest-api-spec/api/*" > .git/info/sparse-checkout
git pull --depth=1 origin master
```

### Usage

At the root of the Kibana repository, run the following commands:

```sh
yarn spec_to_console -g "<ELASTICSEARCH-REPO-FOLDER>/rest-api-spec/src/main/resources/rest-api-spec/api/*" -d "src/plugins/console/server/lib/spec_definitions/json/generated"
```

### Information used in Console that is not available in the REST spec

* Request bodies
* Data fetched at runtime: indices, fields, snapshots, etc
* Ad hoc additions

### Updating the script
When converting query params defined in the REST API specs to console autocompletion definitions, the script relies on a set of known conversion rules specified in [lib/convert/params.js](https://github.com/elastic/kibana/blob/main/packages/kbn-spec-to-console/lib/convert/params.js).
For example, `"keep_on_completion":{"type":"boolean"}` from REST API specs is converted to `"keep_on_completion": "__flag__"` in console autocomplete definitions.
When an unknown parameter type is encountered in REST API specs, the script will throw an `Unexpected type error` and the file [lib/convert/params.js](https://github.com/elastic/kibana/blob/main/packages/kbn-spec-to-console/lib/convert/params.js) needs to be updated by adding a new conversion rule. 