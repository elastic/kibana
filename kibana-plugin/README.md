> **NOTE:** Kibana now includes [its own plugin generator](https://github.com/elastic/kibana/tree/master/packages/kbn-plugin-generator). You should use this to generate your plugin if you are targeting Kibana 6.3 or greater.

# template-kibana-plugin

[![Apache License](https://img.shields.io/badge/license-apache_2.0-a9215a.svg)](https://raw.githubusercontent.com/elastic/template-kibana-plugin/master/LICENSE)
[![Build Status](https://travis-ci.org/elastic/template-kibana-plugin.svg?branch=master)](https://travis-ci.org/elastic/template-kibana-plugin)

This project is an [sao.js](https://sao.js.org) template for bootstrapping a Kibana Plugin. It creates a basic hello world Kibana plugin with all the elements in place so you can easily get started with creating your first Kibana plugin.

## Compatibility

Generator Version | Min Kibana Version | Max Kibana Version
----------------- | ------------------ | ------------------
[bundled plugin generator](https://github.com/elastic/kibana/tree/master/packages/kbn-plugin-generator)  | 6.3 | master
^7.0.1 | 5.5.0 | 6.2
^6.2.2 | 5.0.0 | 5.4.x

## Getting Started

### Setup your Kibana development enviroment

You can find instructions on the [Kibana development documentation](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#development-environment-setup)

### Double check that your Node.js version matches Kibana's [.node-version](https://github.com/elastic/kibana/blob/master/.node-version) file

```sh
node --version
```

**HINT:** If you install [`nvm`](https://github.com/creationix/nvm#install-script) and [`avn`](https://github.com/wbyoung/avn) then you can create your own `.node-version` file and `avn` will switch to it _automatically_!

### Create a directory for your plugin that is right next to your Kibana directory.

The Kibana directory must be named `kibana`, and your plugin directory must be a sibling directory

```sh
ls ~/wherever/you/store/your/code
  kibana # <- where you store the Kibana development environment
  my-new-plugin # <- your plugin directory
```

### Install SAO
```sh
npm install -g sao
```

### Run the generator

```sh
cd my-new-plugin
sao kibana-plugin
```

**HINT:** If you need to use a version other than the latest, you can specify it when you run the template:

```sh
# SAO will install template-kibana-plugin@7.2.4
sao kibana-plugin@7.2.4
```

### [Optional] Get the URL for your Elasticsearch installation

Elasticsearch is available at `http://localhost:9200`, unless you explicitly changed it in the Elasticsearch config.

### Start Kibana in development mode with your new plugin included

```sh
npm start
```

**HINT:** If your Elasticsearch instance is running on another port, you can pass it in here.

```sh
npm start -- --elasticsearch.url 'http://localhost:9200'

# passing the elasticsearch.url here is to demonstrate how arguments can
# be passed to kibana with `npm start` but is not actually necessary if
# you are running elasticsearch locally
```

### Open your Kibana instance

Visit [http://localhost:5601](http://localhost:5601) with your web browser of choice.

## Development Tasks

  - `npm start`

    Start kibana and have it include this plugin

  - `npm start -- --config kibana.yml`

    You can pass any argument that you would normally send to `bin/kibana` by putting them after `--` when running `npm start`

  - `npm run build`

    Build a distributable archive

  - `npm run test:browser`

    Run the browser tests in a real web browser

  - `npm run test:server`

    Run the server tests using mocha

For more information about any of these commands run `npm run ${task} -- --help`.
