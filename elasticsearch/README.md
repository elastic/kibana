<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# Elasticsearch Node.js client

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://badge.buildkite.com/15e4246eb268ea78f6e10aa90bce38c1abb0a4489e79f5a0ac.svg)](https://buildkite.com/elastic/elasticsearch-javascript-client-integration-tests/builds?branch=main)  [![Node CI](https://github.com/elastic/elasticsearch-js/actions/workflows/nodejs.yml/badge.svg)](https://github.com/elastic/elasticsearch-js/actions/workflows/nodejs.yml)  [![codecov](https://codecov.io/gh/elastic/elasticsearch-js/branch/master/graph/badge.svg)](https://codecov.io/gh/elastic/elasticsearch-js)  [![NPM downloads](https://img.shields.io/npm/dm/@elastic/elasticsearch.svg?style=flat)](https://www.npmjs.com/package/@elastic/elasticsearch)

**[Download the latest version of Elasticsearch](https://www.elastic.co/downloads/elasticsearch)**
or
**[sign-up](https://cloud.elastic.co/registration?elektra=en-ess-sign-up-page)**
**for a free trial of Elastic Cloud**.

The official Node.js client for Elasticsearch.

## Installation

Refer to the [Installation section](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html#_installation)
of the getting started documentation.

## Connecting

Refer to the [Connecting section](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html#_connecting)
of the getting started documentation.

## Compatibility

The Elasticsearch client is compatible with currently maintained JS versions.

Language clients are forward compatible; meaning that clients support
communicating with greater or equal minor versions of Elasticsearch without
breaking. It does not mean that the client automatically supports new features
of newer Elasticsearch versions; it is only possible after a release of a new
client version. For example, a 8.12 client version won't automatically support
the new features of the 8.13 version of Elasticsearch, the 8.13 client version
is required for that. Elasticsearch language clients are only backwards
compatible with default distributions and without guarantees made.

| Elasticsearch Version | Elasticsearch-JS Branch  | Supported |
| --------------------- | ------------------------ | --------- |
| main                  | main                     |           |
| 8.x                   | 8.x                      | 8.x       |
| 7.x                   | 7.x                      | 7.17      |

## Usage

* [Creating an index](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html#_creating_an_index)
* [Indexing a document](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html#_indexing_documents)
* [Getting documents](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html#_getting_documents)
* [Searching documents](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html#_searching_documents)
* [Updating documents](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html#_updating_documents)
* [Deleting documents](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html#_deleting_documents)
* [Deleting an index](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html#_deleting_an_index)

### Node.js support

NOTE: The minimum supported version of Node.js is `v18`.

The client versioning follows the Elastic Stack versioning, this means that
major, minor, and patch releases are done following a precise schedule that
often does not coincide with the [Node.js release](https://nodejs.org/en/about/releases/) times.

To avoid support insecure and unsupported versions of Node.js, the
client **will drop the support of EOL versions of Node.js between minor releases**.
Typically, as soon as a Node.js version goes into EOL, the client will continue
to support that version for at least another minor release. If you are using the client
with a version of Node.js that will be unsupported soon, you will see a warning
in your logs (the client will start logging the warning with two minors in advance).

Unless you are **always** using a supported version of Node.js, 
we recommend defining the client dependency in your
`package.json` with the `~` instead of `^`. In this way, you will lock the
dependency on the minor release and not the major. (for example, `~7.10.0` instead
of `^7.10.0`).

| Node.js Version | Node.js EOL date | End of support         |
| --------------- |------------------| ---------------------- |
| `8.x`           | `December 2019`  | `7.11` (early 2021)    |
| `10.x`          | `April 2021`     | `7.12` (mid 2021)      |
| `12.x`          | `April 2022`     | `8.2` (early 2022)     |
| `14.x`          | `April 2023`     | `8.8` (early 2023)     |
| `16.x`          | `September 2023` | `8.11` (late 2023)     |

### Compatibility

Language clients are forward compatible; meaning that clients support communicating with greater or equal minor versions of Elasticsearch.
Elasticsearch language clients are only backwards compatible with default distributions and without guarantees made.

| Elasticsearch Version | Client Version |
| --------------------- |----------------|
| `8.x`                 | `8.x`          |
| `7.x`                 | `7.x`          |
| `6.x`                 | `6.x`          |
| `5.x`                 | `5.x`          |

To install a specific major of the client, run the following command:
```
npm install @elastic/elasticsearch@<major>
```

#### Browser

> [!WARNING]
> There is no official support for the browser environment. It exposes your Elasticsearch instance to everyone, which could lead to security issues.
We recommend that you write a lightweight proxy that uses this client instead, you can see a proxy example [here](./docs/examples/proxy).

## Documentation

* [Introduction](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/introduction.html)
* [Usage](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-connecting.html#client-usage)
* [Client configuration](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-configuration.html)
* [API reference](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html)
* [Authentication](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-connecting.html#authentication)
* [Observability](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/observability.html)
* [Creating a child client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/child.html)
* [Client helpers](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-helpers.html)
* [Typescript support](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/typescript.html)
* [Testing](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-testing.html)
* [Examples](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/examples.html)

## Install multiple versions
If you are using multiple versions of Elasticsearch, you need to use multiple versions of the client. In the past, install multiple versions of the same package was not possible, but with `npm v6.9`, you can do that via aliasing.

The command you must run to install different version of the client is:

```sh
npm install <alias>@npm:@elastic/elasticsearch@<version>
```

So for example if you need to install `7.x` and `6.x`, you will run:

```sh
npm install es6@npm:@elastic/elasticsearch@6
npm install es7@npm:@elastic/elasticsearch@7
```

And your `package.json` will look like the following:

```json
"dependencies": {
  "es6": "npm:@elastic/elasticsearch@^6.7.0",
  "es7": "npm:@elastic/elasticsearch@^7.0.0"
}
```

You will require the packages from your code by using the alias you have defined.

```js
const { Client: Client6 } = require('es6')
const { Client: Client7 } = require('es7')

const client6 = new Client6({
  cloud: { id: '<cloud-id>' },
  auth: { apiKey: 'base64EncodedKey' }
})
const client7 = new Client7({
  cloud: { id: '<cloud-id>' },
  auth: { apiKey: 'base64EncodedKey' }
})

client6.info().then(console.log, console.log)
client7.info().then(console.log, console.log)
```

Finally, if you want to install the client for the next version of Elasticsearch
*(the one that lives in Elasticsearch’s main branch)*, you can use the following
command:

```sh
npm install esmain@github:elastic/elasticsearch-js
```

## License

This software is licensed under the [Apache License 2.0](./LICENSE).
