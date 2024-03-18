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

And the target spec will look like

```yaml
openapi: 3.0.3
info:
  title: Bundled specs file. See individual paths.verb.tags for details
  version: not applicable
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
  schemas: {}
```

## Supported custom (`x-` prefixed) properties

OpenAPI specification allows to define custom properties. They can be used to describe extra functionality that is not covered by the standard OpenAPI Specification. We currently support the following custom properties

- [x-internal](#x-internal) - marks source spec nodes the bundler must NOT include in the target spec
- [x-modify](#x-modify) - marks nodes to be modified by the bundler
- [x-inline](#x-inline) - marks reference nodes to be inlined when bundled

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

The target spec will look like

```yaml
openapi: 3.0.3
info:
  title: Bundled specs file. See individual paths.verb.tags for details
  version: not applicable
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

The target spec will look like

```yaml
openapi: 3.0.3
info:
  title: Bundled specs file. See individual paths.verb.tags for details
  version: not applicable
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

The target spec will look like

```yaml
openapi: 3.0.0
info:
  title: Bundled specs file. See individual paths.verb.tags for details
  version: not applicable
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

The target spec will look like

```yaml
openapi: 3.0.0
info:
  title: Bundled specs file. See individual paths.verb.tags for details
  version: not applicable
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

The target spec will look like

```yaml
openapi: 3.0.0
info:
  title: Bundled specs file. See individual paths.verb.tags for details
  version: not applicable
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

The target spec will look like

```yaml
openapi: 3.0.3
info:
  title: Bundled specs file. See individual paths.verb.tags for details
  version: not applicable
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
