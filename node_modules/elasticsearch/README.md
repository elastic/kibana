# elasticsearch.js

The official low-level Elasticsearch client for Node.js and the browser.

[![Build Status](http://img.shields.io/travis/elasticsearch/elasticsearch-js/2.4.svg?style=flat-square)](https://travis-ci.org/elasticsearch/elasticsearch-js?branch=3.1)
[![Coverage Status](http://img.shields.io/coveralls/elasticsearch/elasticsearch-js/2.4.svg?style=flat-square)](https://coveralls.io/r/elasticsearch/elasticsearch-js?branch=3.1)
[![Dependencies up to date](http://img.shields.io/david/elasticsearch/elasticsearch-js.svg?style=flat-square)](https://david-dm.org/elasticsearch/elasticsearch-js)

## Features

 - One-to-one mapping with REST API and the other official clients
 - Generalized, pluggable architecture. See [Extending Core Components](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/extending_core_components.html)
 - Configurable, automatic discovery of cluster nodes
 - Persistent, Keep-Alive connections
 - Load balancing (with pluggable selection strategy) across all available nodes.

## Use in Node.js

```
npm install elasticsearch
```

Supported node versions include 0.8, 0.10, and now 0.11

[![NPM Stats](https://nodei.co/npm/elasticsearch.png?downloads=true)](https://npmjs.org/package/elasticsearch)

## Use in the Browser

Check out the [Browser Builds](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/browser-builds.html) doc page for help downloading and setting up the client for use in the browser.

<table><tr>
<td>bower:</td>
<td colspan="2"><code>bower install elasticsearch</code></td>
</tr><tr>
<td>download:</td>
<td align="center">
<a href="https://download.elasticsearch.org/elasticsearch/elasticsearch-js/elasticsearch-js-3.1.3.zip">zip</a>
</td>
<td align="center">
<a href="https://download.elasticsearch.org/elasticsearch/elasticsearch-js/elasticsearch-js-3.1.3.tar.gz">tar.gz</a>
</td>
</tr>
</table>

## Docs
 - [Quick Start](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/quick-start.html)
 - [Browser Builds](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/browser-builds.html)
 - [API](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/api-reference.html)
 - [Configuration](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/configuration.html)
 - [Development/Contributing](https://github.com/elasticsearch/elasticsearch-js/blob/master/CONTRIBUTING.md)
 - [Extending Core Components](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/extending_core_components.html)
 - [Logging](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/logging.html)

## Supported Elasticsearch Versions

[![Supporting Elasticsearch Version 0.90 to 1.4](http://img.shields.io/badge/elasticsearch-0.90--1.4-green.svg?style=flat-square)](http://build-eu-00.elasticsearch.org/job/es-js_nightly/)

Elasticsearch.js provides support for, and is regularly tested against, Elasticsearch releases 0.90.12 and greater. We also test against the latest changes in several branches in the Elasticsearch repository. To tell the client which version of Elastisearch you are using, and therefore the API it should provide, set the `apiVersion` config param. [More info](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/configuration.html#_config_options)

## Examples

Create a client instance
```js
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
});
```

Send a HEAD request to `/?hello=elasticsearch` and allow up to 1 second for it to complete.
```js
client.ping({
  // ping usually has a 100ms timeout
  requestTimeout: 1000,

  // undocumented params are appended to the query string
  hello: "elasticsearch!"
}, function (error) {
  if (error) {
    console.trace('elasticsearch cluster is down!');
  } else {
    console.log('All is well');
  }
});
```

Skip the callback to get a promise back
```js
client.search({
  q: 'pants'
}).then(function (body) {
  var hits = body.hits.hits;
}, function (error) {
  console.trace(error.message);
});
```

Find tweets that have "elasticsearch" in their body field
```js
client.search({
  index: 'twitter',
  type: 'tweets',
  body: {
    query: {
      match: {
        body: 'elasticsearch'
      }
    }
  }
}).then(function (resp) {
    var hits = resp.hits.hits;
}, function (err) {
    console.trace(err.message);
});
```

More examples and detailed information about each method are available [here](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/index.html)

## License

This software is licensed under the Apache 2 license, quoted below.

    Copyright (c) 2014 Elasticsearch <http://www.elasticsearch.org>

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
