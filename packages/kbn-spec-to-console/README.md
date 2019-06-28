A mini utility to convert [Elasticsearch's REST spec](https://github.com/elastic/elasticsearch/blob/master/rest-api-spec) to Console's (Kibana) autocomplete format.


It is used to semi-manually update Console's autocompletion rules.



### Retrieving the spec
```
cd es-spec
git init
git remote add origin https://github.com/elastic/elasticsearch
git config core.sparsecheckout true
echo "rest-api-spec/src/main/resources/rest-api-spec/api/*" > .git/info/sparse-checkout
git pull --depth=1 origin master
```

### Usage
```
yarn spec_to_console \
  -g "es-spec/rest-api-spec/src/main/resources/rest-api-spec/api/*.json" \
  -d "../kibana/src/core_plugins/console/api_server/spec/generated"
```

### Information used in Console that is not available in the REST spec
* Request bodies
* Data fetched at runtime: indices, fields, snapshots, etc
* Ad hoc additions
