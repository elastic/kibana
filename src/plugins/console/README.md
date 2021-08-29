# Console

## About

Console provides the user with tools for storing and executing requests against Elasticsearch.

## Features

### `load_from` query parameter

The `load_from` query parameter enables opening Console with prepopulated reuqests in two ways: from the elastic.co docs and from within other parts of Kibana.

Plugins can open requests in Kibana by assigning this parameter a `data:text/plain` [lz-string](https://pieroxy.net/blog/pages/lz-string/index.html) encoded value. For example, navigating to `/dev_tools#/console?load_from=data:text/plain,OIUQKgBA+gzgpgQwE4GMAWAoA3gIgI4CucSAnjgFy4C2CALulAgDZMVYC+nQA` will prepopulate Console with the following request:

```
GET _search
{"query":{"match_all":{}}}
```
