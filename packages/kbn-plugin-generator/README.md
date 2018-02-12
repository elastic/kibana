# Kibana Plugin Generator

This package can be used to generate a Kibana plugin from the Kibana repo.

## Compatibility

The plugin generator is a part of the Kibana project as of Kibana 6.3, so if you are targeting versions before 6.3 then continue to use the [Kibana plugin sao template](https://github.com/elastic/template-kibana-plugin). If you are targeting Kibana 6.3 or greater then checkout the corresponding Kibana and run the plugin generator from that branch.

## Quick Start

The plugin generator is exposed with a node script in the Kibana repo, run it from there with the `--help` flag for info about options you can pass.

```sh
node scripts/generate_plugins
```

## Usage

### Setup your Kibana development environment

You can find instructions on the [Kibana development documentation](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#development-environment-setup)

### Double check that your Node.js version matches Kibana's [.node-version](https://github.com/elastic/kibana/blob/master/.node-version) file

```sh
node --version
```

**HINT:** If you install [`nvm`](https://github.com/creationix/nvm#install-script) and [`avn`](https://github.com/wbyoung/avn) then you can create your own `.node-version` file and `avn` will switch to it _automatically_!

### Run the generator

```sh
node script/generate_plugin [your-plugin-name]
```

This will generate your plugin in `../kibana-extra/<your-plugin-name>` relative to your Kibana repo.

### [Optional] Get the URL for your Elasticsearch installation

Elasticsearch is available at `http://localhost:9200`, unless you explicitly changed it in the Elasticsearch config.

### Start Kibana in development mode with your new plugin included

```sh
cd ../kibana-extra/<your-plugin-name>
yarn start
```

**HINT:** If your Elasticsearch instance is running on another port, you can pass it in here.

```sh
yarn start --elasticsearch.url 'http://localhost:9200'

# passing the elasticsearch.url here is to demonstrate how arguments can
# be passed to kibana with `yarn start` but is not actually necessary if
# you are running elasticsearch locally
```

### Open your Kibana instance

Visit [http://localhost:5601](http://localhost:5601) with your web browser of choice.

## Development Tasks

  - `yarn start`

    Start kibana and have it include this plugin

  - `yarn start --config kibana.yml`

    You can pass any argument that you would normally send to `bin/kibana`

  - `yarn build`

    Build a distributable archive

  - `yarn test:browser`

    Run the browser tests in a real web browser

  - `yarn test:server`

    Run the server tests using mocha

For more information about any of these commands run `yarn ${task} --help`.
