## OpenAPI Generator (`kbn-openapi-generator`) Usage Guide

OpenAPI code generator (`kbn-openapi-generator`) could be used to generate runtime types, documentation, server stub implementations, clients, and much more (later just artifacts) given OpenAPI specification. Usually the main goal is to generate Zod schemas and related TypeScript types and integrate them into routes implementation and the other code. This guide focuses on mainly on that topic.

### How to organize files with OpenAPI specs?

You have quite a lot of freedom on organizing your OpenAPI specs and code generator supports any valid OpenAPI. Though we recommend to follow rules derived from using OpenAPI specs and code generation in Rule Management team

- All your OpenAPI specs should be under a single domain folder with clear ownership assigned to your team via `.CODEOWNERS` file.
- Prefer placing OpenAPI specs in a package (see `kbn-securitysolution-lists-common` or `kbn-securitysolution-exceptions-common` for examples). Generated artifacts can be easily imported into the other packages or plugins. Having specs in a package simplify reusing (you don't need long relative paths `../../../../my.schema.yaml`) of common OpenAPI primitives like `NonEmptyString` or `UUID` defined in `kbn-openapi-common` package.
- Split API endpoint declarations into separate files. The rule of thumb here is having one HTTP Method declaration per file. For example you want to declare two endpoints `GET /api/my/data` and `POST /api/my/data` so you need to create two OpenAPI spec files for them.
- Make sure you define `operationId` for each path item.
- Make sure file name matches defined `operationId`.
- Feel free to group OpenAPI specs inside domain folder in smaller groups according business logic.

> **Info:** By default OpenAPI code generator expects OpenAPI spec files named `<my-name>.schema.yaml`. If it's absolutely necessary to use another suffix make sure OpenAPI code generator picks file up by expecting generating script where `generate()` function is invoked.

#### Example

You can find an example package's folder structure

- kbn-solutionname-domain-name-common
  - api
    - business feature A
      - create_entity.schema.yaml
      - delete_entity.schema.yaml
        ...
    - business feature B
      - read_configuration.schema.yaml
      - update_featureB_entity.schema.yaml
        ...
  - scripts - openapi_generate.js
    ...

### How to enable code generation?

By default OpenAPI code generator generation produces artifacts for `components` defined in OpenAPI specs but disabled for `paths`. `x-codegen-enabled` custom property allows to enable/disable code generation for particular path item or components. `x-codegen-enabled: true` should be always added to path items you want to enable code generation for.

> **Warning:** When code generation for path items is enabled OpenAPI code generator produces Zod schemas and TS types for request body, request parameters and successful response. ==You DON'T need to define schemas for request body, request parameters and successful response manually.== If you don't see such artifacts most probably path items code generation is disabled.

#### Examples

The following example demonstrates an API endpoint declaration with enabled code generation. Notice `x-codegen-enabled: true` added to the path item to enable code generation. When it's omitted code generator will only produce artifacts for `components.schemas.ReadDeleted` schema. `common.schema.yaml` doesn't have property `x-codegen-enabled` since code generation is enabled by default for schema components.

**read_entity.schema.yaml**

```yaml
openapi: 3.0.0
info:
  title: Read entity
  version: '2023-10-31'
paths:
  /api/my/data/{id}:
    get:
      x-labels: [serverless, ess]
      x-codegen-enabled: true
      operationId: ReadEntity
      summary: Reads entity
      description: This a more detailed description why you should read an entity
      parameters:
        - name: id
          in: path
          required: true
          description: The entity's `id` value
          schema:
            $ref: '../common.schema.yaml#/components/schemas/EntityId'
        - name: read_deleted
          in: query
          required: false
          description: Whether request should return deleted entity
          schema:
            $ref: '#/components/schemas/ReadDeleted'
      responses:
        200:
          description: Indicates a successful call
          content:
            application/json:
              schema:
                $ref: '../common.schema.yaml#/components/schemas/Entity'

components:
  schemas:
    ReadDeleted:
      type: boolean
```

**common.schema.yaml**

```yaml
openapi: 3.0.0
info:
  title: Common schemas
  version: 'not applicable'

components:
  schemas:
    EntityId:
      type: string

    Entity:
      type: object
      properties:
        id:
          $ref: '#/components/schemas/EntityId'
        value:
          type: string
      required: [id, value]
```

In a case when you want to disable code generation for components add `x-codegen-enabled: false` under `components` object as in the example below

```yaml
openapi: 3.0.0
info:
  title: Common schemas
  version: 'not applicable'

components:
  x-codegen-enabled: false
  schemas:
    EntityId:
      type: string

    Entity:
      type: object
      properties:
        id:
          $ref: '#/components/schemas/EntityId'
        value:
          type: string
      required: [id, value]
```
