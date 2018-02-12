# <%= name %>

<%- (description || '').split('\n').map(function (line) {
  return '> ' + line
}).join('\n') %>

---

## development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md) for instructions setting up your development environment. Once you have completed that, use the following yarn scripts.

  - `yarn kbn bootstrap`

    Install dependencies and crosslink Kibana and all projects/plugins.

    > ***IMPORTANT:*** Use this script instead of `yarn` to install dependencies when switching branches, and re-run it whenever your dependencies change.

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

For more information about any of these commands run `yarn run ${task} --help`.
