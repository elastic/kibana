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

You need to run the command twice: once for the **OSS** specs and once for the **X-Pack** specs  
At the root of the Kibana repository, run the following commands:

```sh
# OSS
yarn spec_to_console \
  -g "<ELASTICSEARCH-REPO-FOLDER>/rest-api-spec/src/main/resources/rest-api-spec/api/*" \
  -d "src/legacy/core_plugins/console/api_server/spec/generated"

# X-pack
yarn spec_to_console \
  -g "<ELASTICSEARCH-REPO-FOLDER>/x-pack/plugin/src/test/resources/rest-api-spec/api/*" \
  -d "x-pack/plugins/console_extensions/spec/generated"
```

### Information used in Console that is not available in the REST spec

* Request bodies
* Data fetched at runtime: indices, fields, snapshots, etc
* Ad hoc additions
