## OpenAPI Generator (`kbn-openapi-generator`) Usage Guide

OpenAPI code generator (`kbn-openapi-generator`) could be used to generate different artifacts like runtime types, documentation, server stub implementations, clients, and much more given OpenAPI specification. Usually the first priority is to generate Zod schemas and related TypeScript types and integrate them into routes implementation and related code. The current guide focuses mainly on that topic.

Any OpenAPI spec files should conform to [OpenAPI Specification 3.0](https://swagger.io/specification/v3/). OpenAPI Generator supports a subset of the specification.

_For general information and getting started guide check `README` in the root of this package._

### How to organize files with OpenAPI specs?

We recommend to follow rules described below. These rules were derived from hands-on experience while using OpenAPI specs and code generation in Rule Management team.

- Prefer placing OpenAPI specs in a package (see `kbn-securitysolution-lists-common` or `kbn-securitysolution-exceptions-common` for examples). Generated artifacts can be easily imported into the other packages or plugins. Having specs in a package simplify reusing (you don't need long relative paths `../../../../my.schema.yaml`) of common OpenAPI primitives like `NonEmptyString` or `UUID` defined in `kbn-openapi-common` package.
- Split API endpoint declarations into separate files. The rule of thumb here is having one HTTP Method declaration per file. For example you want to declare two endpoints `GET /api/my/data` and `POST /api/my/data` so you need to create two OpenAPI spec files for them.
- Make sure you define `operationId` for each path item. `operationId` is a unique string used to identify the operation (a single API operation on a path like `GET` and `POST`). The id MUST be unique among all operations described in Kibana. The `operationId` value is case-sensitive. Tools and libraries use the `operationId` to uniquely identify an operation.
- Make sure OpenAPI spec file name matches defined `operationId` so it can be easily found in IDE.
- Feel free to group OpenAPI specs inside domain folder in smaller groups according to the business logic.
- Prefer reducing tight coupling by using index files to reexport artifacts from `*.gen.ts` files (see `kbn-securitysolution-lists-common` or `kbn-securitysolution-exceptions-common` for examples).

> **Info:** By default OpenAPI code generator expects OpenAPI spec files named `<my-name>.schema.yaml`. If it's absolutely necessary to use another suffix make sure OpenAPI code generator picks file up by modifying generating script where `generate()` function is invoked.

You have quite a lot of freedom on organizing your OpenAPI specs and code generator supports any valid OpenAPI.

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

> **Warning:** When code generation for path items is enabled OpenAPI code generator produces Zod schemas and TS types for request body, request parameters and successful response. **You AREN'T required to define schemas for request body, request parameters and successful response manually.** If you don't see such artifacts most probably path items code generation is disabled.

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

### How to integrate generated artifacts into route's implementation?

Having OpenAPI specs and code generation by itself doesn't guarantee OpenAPI describes API endpoints precisely. To make sure OpenAPI description and implementation match you should use generated artifacts in route's implementation for input and optionally output data validation and type checking. Let's consider the following OpenAPI spec describing `/api/my/path/{id}` API endpoint

```yaml
openapi: 3.0.0
info:
  title: Create entity endpoint
  version: '2023-10-31'

paths:
  /api/my/data/{id}:
    post:
      x-labels: [serverless, ess]
      x-codegen-enabled: true
      operationId: CreateEntity
      summary: Creates entity
      description: This a more detailed description why you should create an entity
      parameters:
        - name: id
          in: path
          required: false
          description: This is an example optional request path parameter
          schema:
            $ref: '#/components/schemas/EntityId'
        - name: keep_hidden
          in: query
          required: false
          description: This is an example request query parameter
          schema:
            $ref: '#/components/schemas/ReadDeleted'
      requestBody:
        description: This is an example request query parameter
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                fieldA:
                  type: string
                fieldB:
                  type: boolean
              required: [fieldA, fieldB]
      responses:
        200:
          description: Indicates a successful call
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Entity'

components:
  schemas:
    EntityId:
      type: string

    ReadDeleted:
      type: boolean

    Entity:
      type: object
      properties:
        id:
          type: string
        value:
          type: string
      required: [id, value]
```

Running OpenAPI Generator on that file will produce the following `.gen.ts` file

```ts
import { z } from '@kbn/zod';

export type EntityId = z.infer<typeof EntityId>;
export const EntityId = z.string();

export type ReadDeleted = z.infer<typeof ReadDeleted>;
export const ReadDeleted = z.boolean();

export type Entity = z.infer<typeof Entity>;
export const Entity = z.object({
  id: z.string(),
  value: z.string(),
});

export type CreateEntityRequestQuery = z.infer<typeof CreateEntityRequestQuery>;
export const CreateEntityRequestQuery = z.object({
  /**
   * This is an example request query parameter
   */
  keep_hidden: ReadDeleted.optional(),
});
export type CreateEntityRequestQueryInput = z.input<typeof CreateEntityRequestQuery>;

export type CreateEntityRequestParams = z.infer<typeof CreateEntityRequestParams>;
export const CreateEntityRequestParams = z.object({
  /**
   * This is an example optional request path parameter
   */
  id: EntityId.optional(),
});
export type CreateEntityRequestParamsInput = z.input<typeof CreateEntityRequestParams>;

export type CreateEntityRequestBody = z.infer<typeof CreateEntityRequestBody>;
export const CreateEntityRequestBody = z.object({
  fieldA: z.string(),
  fieldB: z.boolean(),
});
export type CreateEntityRequestBodyInput = z.input<typeof CreateEntityRequestBody>;

export type CreateEntityResponse = z.infer<typeof CreateEntityResponse>;
export const CreateEntityResponse = Entity;
```

Generated artifacts above could be integrated into route's implementation in the following way

```ts
import {
  CreateEntityRequestParams,
  CreateEntityRequestQuery,
  CreateEntityRequestBody,
  CreateEntityResponse,
} from './my/api_domain';

export const createEntityRoute = (router: Router): void => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/my/data/{id}',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution']
        }
      }
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: buildRouteValidationWithZod(CreateEntityRequestParams),
            query: buildRouteValidationWithZod(CreateEntityRequestQuery),
            body: buildRouteValidationWithZod(CreateEntityRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<CreateEntityResponse>> => {
        try {
          // implementation goes here
          const options = {
            id: request.params.id,
            keepHidden: request.query.keep_hidden,
          };
          const result = await createEntity(request.body, options);

          // Optional output validation.
          // Could just return `result` but it makes sense to validate the `result` when we can't
          // control it's construction or the return type is too way complex.
          return response.ok({
            body: CreateEntityResponse.parse(result),
          });

          // Another option is to construct response explicitly
          // return response.ok({
          //   body: {
          //     id: result.id,
          //     value: result.value,
          //   }
          // });
        } catch (err) {
          const error = transformError(err as Error);

          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
```

### Can I use references in OpenAPI specs?

OpenAPI Generator supports only `schema` references currently. Using references for `responses`, `parameters`, `requestBodies` and `pathItems` will lead either to errors during code generation or invalid `.gen.ts` files.

If you strongly believe any of the unsupported references should be supported by OpenAPI Generator feel free to create an enhancement ticket in GitHub and assign it to Rule Management team.

### Can I use circular/self-circular (recursive/self-recursive) schemas?

Yes you can define local circular and/or self-circular schemas. Support for that functionality was added in [#186221](https://github.com/elastic/kibana/pull/186221).

It works with exceptions

- Only local references are supported (starting with `#/components/`)
- Discriminated unions aren't supported (a discriminated union should be assembled from object types which makes it more challenging to support them)

If you strongly believe any of the unsupported features should be supported by OpenAPI Generator feel free to create an enhancement ticket in GitHub and assign it to Rule Management team.

### Is there a way to specify `default` value for a referenced schema?

Sometimes you might have an array schema defined in a spec with shared schemas like

**common.schema.yaml**

```yaml
openapi: 3.0.0
info:
  title: Common schemas
  version: 'not applicable'
paths: {}

components:
  schemas:
    ParametersArray:
      type: array
      items:
        $ref: '#/components/schemas/Parameter'

    Parameter:
      type: object
      properties:
        fieldA:
          type: string
        fieldB:
          type: string
```

and you want to reference `ParametersArray` in for example a request body

**spec.schema.yaml**

```yaml
openapi: 3.0.0
info:
  title: Update parameters
  version: '2023-10-31'
paths:
  /api/my/data:
    post:
      x-labels: [serverless, ess]
      x-codegen-enabled: true
      operationId: UpdateParameters
      summary: Updates parameters
      description: This a more detailed description why you should update the parameters
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                someField:
                  type: string
                parameters:
                  $ref: './common.schema.yaml#/components/schemas/ParametersArray'
              required: [someField]
      responses: ...
```

But you also want to have default value for example an empty array. In this case you can't provide any additional properties (including `default`) to the reference since OpenAPI 3.0 doesn't allow any properties next to `$ref`.

The solution is to decompose the `ParametersArray` like below

**spec.schema.yaml**

```yaml
openapi: 3.0.0
info:
  title: Update parameters
  version: '2023-10-31'
paths:
  /api/my/data:
    post:
      x-labels: [serverless, ess]
      x-codegen-enabled: true
      operationId: UpdateParameters
      summary: Updates parameters
      description: This a more detailed description why you should update the parameters
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                someField:
                  type: string
                parameters:
                  type: array
                  items:
                    $ref: './common.schema.yaml#/components/schemas/Parameter'
                  default: []
              required: [someField]
      responses: ...
```
