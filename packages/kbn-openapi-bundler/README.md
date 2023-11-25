# OpenAPI Specs Bundler for Kibana

`@kbn/openapi-bundler` is a tool for transforming multiple OpenAPI specification files (source specs) into a single bundled specification file (target spec).
This can be used for API docs generation purposes. This approach allows you to:

- Abstract away the knowledge of where you keep your OpenAPI specs, how many specs there are, and how to find them. The Docs team should only know where a single file is located - the bundle.
- Omit internal API endpoints from the bundle.
- Omit API endpoints that are hidden behind a feature flag and haven't been released yet.
- Omit parts of schemas that are hidden behind a feature flag (e.g. a new property added to an existing response schema).
- Omit custom OpenAPI attributes from the bundle, such as `x-codegen-enabled`, `x-internal`, and `x-modify` (see below).
- Transform the target schema according to the custom OpenAPI attributes, such as `x-modify`.
- Resolve references and inline some of them for better readability. The bundled file contains only local references and paths.

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

## Supported custom (`x-` prefixed) properties

OpenAPI specification allows to define custom properties. They can be used to describe extra functionality that is not covered by the standard OpenAPI Specification. We currently support the following custom properties

| Custom property | Supported values        | Description                                                                                                                                                                                                                           |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-internal`    | `true` or `false`       | Omit the node and its children from the result document. It's useful when it's necessary to hide some chunk of OpenAPI spec because functionality supporting it is hidden under a feature flag or the chunk is just for internal use. |
| `x-modify`      | `partial` or `required` | Modifies the node. Value `partial` leads to removing `required` property making params under `properties` optional. Value `required` leads to adding or extending `required` property by adding all param names under `properties`.   |
