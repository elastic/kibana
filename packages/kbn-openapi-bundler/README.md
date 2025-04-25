# OpenAPI Specs Bundler for Kibana

This packages provides tooling for manipulating OpenAPI endpoint specifications. It has two tools exposes

- **OpenAPI bundler** is a tool for transforming multiple OpenAPI specification files (source specs) into a bundled specification file(s) (target spec). The number of resulting bundles depends on a number of versions
  used in the OpenAPI specification files. The package can be used for API documentation generation purposes. This approach allows you to:

  - Abstract away the knowledge of where you keep your OpenAPI specs, how many specs are there, and how to find them. Consumer should only know where result files (bundles) are located.
  - Omit internal API endpoints from the bundle.
  - Omit API endpoints that are hidden behind a feature flag and haven't been released yet.
  - Omit parts of schemas that are hidden behind a feature flag (e.g. a new property added to an existing response schema).
  - Omit custom OpenAPI attributes from the bundle, such as `x-codegen-enabled`, `x-internal`, `x-modify` and `x-labels`.
  - Include only dedicated OpenAPI operation objects (a.k.a HTTP verbs) into the result bundle by labeling them via `x-labels`
    and using `includeLabels` bundler option, e.g. produce separate ESS and Serverless bundles
  - Transform the target schema according to the custom OpenAPI attributes, such as `x-modify`.
  - Resolve references, inline some of them and merge `allOf` object schemas for better readability. The bundled file contains only local references and paths.
  - Group OpenAPI specs by version (OpenAPI's `info.version`) and produce a separate bundle for each group

- **OpenAPI merger** is a tool for merging multiple OpenAPI specification files. It's useful to merge already processed specification files to produce a result bundle. **OpenAPI bundler** uses the merger under the hood to merge bundled OpenAPI specification files. Exposed externally merger is a wrapper of the bundler's merger but extended with an ability to parse JSON files and forced to produce a single result file.

## Getting started with OpenAPI bundling

To let this package help you with bundling your OpenAPI specifications you should have OpenAPI specification describing your API endpoint request and response schemas along with common types used in your API. Refer [@kbn/openapi-generator](../kbn-openapi-generator/README.md) and [OpenAPI 3.0.3](https://swagger.io/specification/v3/) (support for [OpenAPI 3.1.0](https://swagger.io/specification/) is planned to be added later) for more details.

Following the recommendations provided in `@kbn/openapi-generator` you should have OpenAPI specs defined under a common folder something like `my-plugin/common/api`.

Currently package supports only programmatic API. As the next step you need to create a JavaScript script file like below and put it to `my-plugin/scripts/openapi`

```ts
require('../../../../../src/setup_node_env');
const { bundle } = require('@kbn/openapi-bundler');
const { join, resolve } = require('path');

// define ROOT as `my-plugin` instead of `my-plugin/scripts/openapi`
// pay attention to this constant when your script's location is different
const ROOT = resolve(__dirname, '../..');

bundle({
  // Glob pattern to find OpenAPI specification files
  sourceGlob: join(ROOT, './**/*.schema.yaml'),
  // Output file path. Absolute or related to the node.js working directory.
  // It may contain `{version}` placeholder which is optional. `{version}` placeholder
  // will be replaced with the bundled specs version. In case the placeholder is omitted
  // resulting bundle's filename will be prepended with a version,
  // e.g. `2023-10-31-my-plugin.bundled.schema.yaml`.
  outputFilePath: join(ROOT, 'target/openapi/my_bundle_name_{version}.bundled.schema.yaml'),
  // OpenAPI info object (excluding `version` field) for the resulting bundle
  // It allows to specify custom title like "My Domain API bundle" and description
  specInfo: {
    title: 'My Domain API bundle',
    description: 'My description',
  },
  // Bundler options (optional)
  options: {
    // Optional `includeLabels` allow to produce Serverless dedicated bundle by including only
    // OpenAPI operations objects (a.k.a HTTP verbs) labeled with specified labels, e.g. `serverless`.
    // It requires labeling relevant operations objects with labels you want to be included, in the example
    // below it should be a `serverless` label.
    includeLabels: ['serverless'],
  },
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

This command will produce one or multiple bundled files like
`my-plugin/target/openapi/my_bundle_name_2023_10_31.bundled.schema.yaml` depending on how many
different versions (OpenAPI's `info.version`) were encountered in the processed bundles.
Produces bundles will contain corresponding specs matching `./**/*.schema.yaml` glob pattern.

Here's an example how your source schemas can look like and the expected result

- `example1.schema.yaml`

```yaml
openapi: 3.0.3
info:
  title: My endpoint
  version: '2023-10-31'

paths:
  /api/path/to/endpoint:
    get:
      x-labels: [ess, serverless]
      operationId: MyGetEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
```

- `example2.schema.yaml`

```yaml
openapi: 3.0.3
info:
  title: My endpoint
  version: '2023-10-31'

paths:
  /api/path/to/endpoint:
    post:
      x-labels: [serverless]
      x-internal: true
      operationId: MyPostEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
```

And the result bundle generated in `target/openapi/my_bundle_name_2023_10_31.bundled.schema.yaml`
will look like

```yaml
openapi: 3.0.3
info:
  title: 'My Domain API bundle'
  description: 'My description'
  version: '2023-10-31'
servers: ...
paths:
  /api/path/to/endpoint:
    get:
      operationId: MyGetEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
    post:
      operationId: MyPostEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
components:
  schemas:
    securitySchemes: ...
```

## Getting started with OpenAPI merger

To let this package help you with merging OpenAPI specifications you should have valid OpenAPI specifications version `3.0.x`. OpenAPI `3.1` is not supported currently.

Currently package supports only programmatic API. As the next step you need to create a JavaScript script file like below

```ts
require('../../src/setup_node_env');
const { resolve } = require('path');
const { merge } = require('@kbn/openapi-bundler');
const { REPO_ROOT } = require('@kbn/repo-info');

(async () => {
  await merge({
    sourceGlobs: [
      `${REPO_ROOT}/my/path/to/spec1.json`,
      `${REPO_ROOT}/my/path/to/spec2.yml`,
      `${REPO_ROOT}/my/path/to/spec3.yaml`,
    ],
    outputFilePath: `${REPO_ROOT}/oas_docs/bundle.serverless.yaml`,
    mergedSpecInfo: {
      title: 'Kibana Serverless',
      version: '1.0.0',
    },
  });
})();
```

Finally you should be able to run OpenAPI merger via

```bash
node ./path/to/the/script.js
```

or it could be added to a `package.json` and run via `yarn`.

After running the script it will log different information and write a merged OpenAPI specification to a the provided path.

### Caveats

Merger shows an error when it's unable to merge some OpenAPI specifications. There is a possibility that references with the same name are defined in two or more files or there are endpoints of different versions and different parameters. Additionally top level `$ref` in path items, path item's `requestBody` and each response in `responses` aren't supported.

## Multiple API versions declared via OpenAPI's `info.version`

Serverless brought necessity for versioned HTTP API endpoints. We started with a single `2023-10-31` version. In some point
in time a group of API endpoints will need to bumps its version due to incompatible changes. In this case engineers need
to declare new version OpenAPI specs.

OpenAPI specification doesn't provide a clear way to version API endpoints besides having different path prefix like `v1/`,
`v2/` and etc. De facto standard is to use OpenAPI's `info.version` to specify API endpoints version. [@kbn/openapi-generator](../kbn-openapi-generator/README.md) follows this pattern as well.

OpenAPI specs bundling brings a challenge related to different API versions. When there is a necessity to bundle OpenAPI specs
describing different API versions then path clashing occurs. It's the case since multiple OpenAPI spec have the same path/HTTP verbs defined. A result bundle can have only one of them. OpenAPI specification doesn't provide a way to adopt HTTP header
versioning Kibana uses.

To address this problem the bundler produces multiple bundles depending on how many distinct API versions were encountered
in `info.version`. Each bundle's name is prefixed with its version. `outputFilePath` provides flexibility to specify a
placeholder to the version via `{version}`. For example the following bundler configuration

```js

bundle({
  ...
  outputFilePath: join(ROOT, 'my_path/my_bundle_name_{version}.bundled.schema.yaml'),
  ...
});
```

will produce as many result bundles in `my_path` as many distinct API version in `info.version` were encountered, e.g.
`my_bundle_name_2023_10_31.bundled.schema.yaml` and `my_bundle_name_2024_01_01.bundled.schema.yaml` if there are only
two distinct version.

## Supported custom (`x-` prefixed) properties

OpenAPI specification allows to define custom properties. They can be used to describe extra functionality that is not covered by the standard OpenAPI Specification. We currently support the following custom properties

- [x-labels](#x-labels) - labels OpenAPI operation objects (a.k.a HTTP verbs), allows to produce separate ESS and Serverless bundles
- [x-internal](#x-internal) - marks source spec nodes the bundler must NOT include in the target spec
- [x-modify](#x-modify) - marks nodes to be modified by the bundler
- [x-inline](#x-inline) - marks reference nodes to be inlined when bundled

### `x-labels`

`x-labels` custom property allows to label OpenAPI operation objects (a.k.a HTTP verbs) with custom string labels like `label-a` or `myLabelB`. Without specifying bundling options By itself `x-labels` don't affect the resulting bundle. It works in conjunction with bundler's `options.includeXLables`. To tell the bundler which operation objects to include `options.includeXLables` should be set to
labels you expect to be in the resulting bundle.

The primary goal of this feature is to make possible producing separate ESS and Serverless bundles. Taking this into account all
operation objects should be labeled by using `x-labels` custom property and `ess` and `serverless` labels.

**Important** If `options.includeXLables` bundler's option is set then bundler will include **only** operation objects having specified labels. Operation objects without `x-labels` custom property or invalid `x-labels` value (an array of strings is expected) will be excluded from the resulting bundle. For example setting `options.includeXLables: ['ess']` will include only operation objects
having `ess` label like `x-labels: [ess]` and `x-labels: [ess, serverless, something-else]`.

An example source spec looks like the following

```yaml
openapi: 3.0.3
info:
  title: My endpoint
  version: '2023-10-31'

paths:
  /api/path/to/endpoint:
    get:
      x-labels: [ess, serverless]
      operationId: MyGetEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
  /api/legacy/ess-only/api/endpoint
    get:
      x-labels: [ess]
      operationId: MyGetEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
```

And the bundler configurations to bundle ESS and Serverless separately will look like

```js
bundle({
  sourceGlob: join(ROOT, './**/*.schema.yaml'),
  outputFilePath: join(
    ROOT,
    'target/openapi/serverless/my_bundle_name_{version}.bundled.schema.yaml'
  ),
  options: {
    includeLabels: ['serverless'],
  },
});

bundle({
  sourceGlob: join(ROOT, './**/*.schema.yaml'),
  outputFilePath: join(ROOT, 'target/openapi/ess/my_bundle_name_{version}.bundled.schema.yaml'),
  options: {
    includeLabels: ['ess'],
  },
});
```

After running the above script the bundler will produce the following bundles

- `target/openapi/serverless/my_bundle_name_2023_10_31.bundled.schema.yaml`

```yaml
openapi: 3.0.3
info:
  title: Bundled OpenAPI specs
  version: '2023-10-31'
servers: ...
paths:
  /api/path/to/endpoint:
    get:
      operationId: MyGetEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
components:
  schemas:
    securitySchemes: ...
```

- `target/openapi/ess/my_bundle_name_2023_10_31.bundled.schema.yaml`

```yaml
openapi: 3.0.3
info:
  title: Bundled OpenAPI specs
  version: '2023-10-31'
servers: ...
paths:
  /api/path/to/endpoint:
    get:
      operationId: MyGetEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
    post:
      operationId: MyPostEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
components:
  schemas:
    securitySchemes: ...
```

### `x-internal`

Marks source spec nodes the bundler must NOT include in the target spec.

**Supported values**: `true`

When bundler encounters a node with `x-internal: true` it doesn't include this node into the target spec. It's useful when it's necessary to hide some chunk of OpenAPI spec because functionality supporting it is hidden under a feature flag or the chunk is just for internal use.

#### Examples

The following spec defines an API endpoint `/api/path/to/endpoint` accepting `GET` and `POST` requests. It has `x-internal: true` defined in `post` section meaning it won't be included in the target spec.

```yaml
openapi: 3.0.3
info:
  title: My endpoint
  version: '2023-10-31'

paths:
  /api/path/to/endpoint:
    get:
      operationId: MyGetEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
    post:
      x-internal: true
      operationId: MyPostEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
```

The result bundle will look like

```yaml
openapi: 3.0.3
info:
  title: Bundled OpenAPI specs
  version: '2023-10-31'
paths:
  /api/path/to/endpoint:
    get:
      operationId: MyGetEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
```

`x-internal: true` can also be defined next to a reference.

```yaml
openapi: 3.0.3
info:
  title: My endpoint
  version: '2023-10-31'

paths:
  /api/path/to/endpoint:
    get:
      operationId: MyGetEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
    post:
      $ref: '#/components/schemas/MyPostEndpointResponse'
      x-internal: true

components:
  schemas:
    MyPostEndpointResponse:
      operationId: MyPostEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
```

The result bundle will look like

```yaml
openapi: 3.0.3
info:
  title: Bundled OpenAPI specs
  version: '2023-10-31'
paths:
  /api/path/to/endpoint:
    get:
      operationId: MyGetEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
```

### `x-modify`

Marks nodes to be modified by the bundler.

**Supported values**: `partial` or `required`

Value `partial` leads to removing `required` property making params under `properties` optional. Value `required` leads to adding or extending `required` property by adding all param names under `properties`.

#### Examples

The following spec has `x-modify: partial` at `schema` section. It makes params optional for a PATCH request.

```yaml
openapi: 3.0.0
info:
  title: My endpoint
  version: '2023-10-31'
paths:
  /api/path/to/endpoint:
    patch:
      operationId: MyPatchEndpoint
      requestBody:
        required: true
        content:
          application/json:
            schema:
              x-modify: partial
              type: object
              properties:
                param1:
                  type: string
                  enum: [val1, val2, val3]
                param2:
                  type: number
              required:
                - param1
                - param2
```

The result bundle will look like

```yaml
openapi: 3.0.0
info:
  title: Bundled OpenAPI specs
  version: '2023-10-31'
paths:
  /api/path/to/endpoint:
    patch:
      operationId: MyPatchEndpoint
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                param1:
                  type: string
                  enum: [val1, val2, val3]
                param2:
                  type: number
```

The following spec has `x-modify: required` at `schema` section. It makes params optional for a PATCH request.

```yaml
openapi: 3.0.0
info:
  title: My endpoint
  version: '2023-10-31'
paths:
  /api/path/to/endpoint:
    put:
      operationId: MyPutEndpoint
      requestBody:
        required: true
        content:
          application/json:
            schema:
              x-modify: required
              type: object
              properties:
                param1:
                  type: string
                  enum: [val1, val2, val3]
                param2:
                  type: number
```

The result bundle will look like

```yaml
openapi: 3.0.0
info:
  title: Bundled OpenAPI specs
  version: '2023-10-31'
paths:
  /api/path/to/endpoint:
    patch:
      operationId: MyPatchEndpoint
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                param1:
                  type: string
                  enum: [val1, val2, val3]
                param2:
                  type: number
              required:
                - param1
                - param2
```

`x-modify` can also be defined next to a reference.

```yaml
openapi: 3.0.0
info:
  title: My endpoint
  version: '2023-10-31'
paths:
  /api/path/to/endpoint:
    patch:
      operationId: MyPatchEndpoint
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PatchProps'
              x-modify: partial

components:
  schemas:
    PatchProps:
      type: object
      properties:
        param1:
          type: string
          enum: [val1, val2, val3]
        param2:
          type: number
      required:
        - param1
        - param2
```

The result bundle will look like

```yaml
openapi: 3.0.0
info:
  title: Bundled OpenAPI specs
  version: '2023-10-31'
paths:
  /api/path/to/endpoint:
    patch:
      operationId: MyPatchEndpoint
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                param1:
                  type: string
                  enum: [val1, val2, val3]
                param2:
                  type: number
```

### `x-inline`

Marks reference nodes to be inlined when bundled.

**Supported values**: `true`

`x-inline: true` can be specified at a reference node itself (a node with `$ref` key) or at a node `$ref` resolves to. When bundler encounters such a node it assigns (copies keys via `Object.assign()`) the latter node (a node`$ref` resolves to) to the first node (a node with `$ref` key). This way target won't have referenced component in `components` as well.

#### Examples

The following spec defines an API endpoint `/api/path/to/endpoint` accepting `POST` request. It has `x-inline: true` specified in `post` section meaning reference `#/components/schemas/MyPostEndpointResponse` will be inlined in the target spec.

```yaml
openapi: 3.0.3
info:
  title: My endpoint
  version: '2023-10-31'

paths:
  /api/path/to/endpoint:
    post:
      $ref: '#/components/schemas/MyPostEndpointResponse'
      x-inline: true

components:
  schemas:
    MyPostEndpointResponse:
      operationId: MyPostEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
```

The result bundle will look like

```yaml
openapi: 3.0.3
info:
  title: Bundled OpenAPI specs
  version: '2023-10-31'
paths:
  /api/path/to/endpoint:
    post:
      operationId: MyPostEndpoint
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
```

### Root level tags with `x-displayName`

OpenAPI documents may have root level tags referenced by name in operations. Some platforms including Bump.sh used for API reference documentation support `x-displayName`. Value specified in that custom property used instead of `tag.name` to display a name.

OpenAPI bundler supports `x-displayName` as well.

#### Examples

To specify a custom tag with `x-displayName` to assign that tag to all operations in the document the following configuration should be specified

```bash
const { bundle } = require('@kbn/openapi-bundler');
const { join, resolve } = require('path');

const ROOT = resolve(__dirname, '../..');

(async () => {
  await bundle({
    // ...
    options: {
      prototypeDocument: {
        tags: [
          {
            name: 'My tag name',
            description: 'My tag description',
            x-displayName: 'My Custom Name',
          },
        ],
      },
    },
  });
})();
```

It will produce a document containing the specified tag assigned to all operations like below

```yaml
openapi: 3.0.3
info: ...
servers: ...
paths:
  /api/some/operation:
    delete:
      operationId: SomeOperation
      ...
      tags:
        - My tag name
        - Tag existing before bundling
components:
  schemas: ...
security: ...
tags:
  - description: My tag description
    name: My tag name
    x-displayName: My Custom Name
```

When merging OpenAPI specs together tags will be sorted by `x-displayName` or `name` in ascending order depending on whether `x-displayName` is specified.

## Contribution

In case you decide to contribute to the `kbn-openapi-bundler` package please make sure to add and/or update existing e2e test in `kbn-openapi-bundler/tests` folder.

To run package tests use the following command in the repo root folder

```bash
yarn test:jest packages/kbn-openapi-bundler
```

Jest watch mode can be enabled by passing `--watch` flag

```bash
yarn test:jest packages/kbn-openapi-bundler --watch
```
