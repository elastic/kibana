# OpenAPI Specs Bundler for Kibana

`@kbn/openapi-bunler` is an OpenAPI utility to produce a single bundled specification file for documentation purposes. Utility resolves references and inlines some of them for better readability. Bundled file contains only local references and paths.

## Getting started

To let this package help you with bundling your OpenAPI specifications you should have OpenAPI specification describing your API endpoint request and response schemas along with common types used in your API. Refer [@kbn/openapi-generator](../kbn-openapi-generator/README.md) and [OpenAPI 3.0.3](https://swagger.io/specification/v3/) (support for [OpenAPI 3.1.0](https://swagger.io/specification/) is planned to be added soon) for more details.

Following recommendations provided in `@kbn/openapi-generator` you should have OpenAPI specs defined under a common folder something like `my-plugin/common/api`.

Currently package supports only programmatic API. As the next step you need to create a JavaScript script file like below and put it to `my-plugin/scripts/openapi`

```ts
require('../../../../../src/setup_node_env');
const { bundle } = require('@kbn/openapi-bundler');
const { resolve } = require('path');

// define ROOT as `my-plugin` instead of `my-plugin/scripts/openapi`
// pay attention to this constant when your script's location is different
const ROOT = resolve(__dirname, '../..');

bundle({
  rootDir: ROOT, // Root path e.g. plugin root directory
  sourceGlob: './**/*.schema.yaml', // Glob pattern to find OpenAPI specification files
  outputFilePath: './target/openapi/my-plugin.bundled.schema.yaml', //
});
```

And add a script entry to your `package.json` file

```json
{
  "author": "Elastic",
  ...
  "scripts": {
    ...
    "openapi:bundle": "node scripts/openapi/bundle"
  }
}
```

Finally you should be able to run OpenAPI bundler via

```bash
yarn openapi:bundle
```

This command will produce a bundled file `my-plugin/target/openapi/my-plugin.bundled.schema.yaml` containing
all specs matching `./**/*.schema.yaml` glob pattern.
