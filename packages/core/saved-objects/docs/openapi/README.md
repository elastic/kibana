# OpenAPI (Experimental)

The current self-contained spec file is `bundled.json` or `bundled.yaml` and can be used for online tools like those found at <https://openapi.tools/>.
This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

## The `openapi` folder

* `entrypoint.yaml` is the overview file which pulls together all the paths and components.
* [Paths](paths/README.md): this defines each endpoint.  A path can have one operation per http method.

## Tools

To validate and bundle the docs, you can use [Redocly](https://redocly.com/docs/cli/) and [Swagger/OpenAPI CLI](https://www.npmjs.com/package/swagger-cli).

For example, run the following commands from the `packages/core/saved-objects/docs/openapi/` folder:

```bash
npx swagger-cli validate entrypoint.yaml
npx swagger-cli validate entrypoint-serverless.yaml
```

Then you can generate the `bundled` files by running the following commands:

```bash
npx @redocly/cli bundle entrypoint.yaml --output bundled.yaml --ext yaml
npx @redocly/cli bundle entrypoint.yaml --output bundled.json --ext json
npx @redocly/cli bundle entrypoint_serverless.yaml --output bundled_serverless.yaml --ext yaml
npx @redocly/cli bundle entrypoint_serverless.yaml --output bundled_serverless.json --ext json
```

After generating the json bundle ensure that it is also valid by running the following command:

```bash
npx @redocly/cli lint bundled.json
npx @redocly/cli lint bundled_serverless.json
```
