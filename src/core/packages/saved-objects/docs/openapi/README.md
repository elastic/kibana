# OpenAPI (Experimental)

The current self-contained spec file is `bundled_ess.json` or `bundled_ess.yaml` and can be used for online tools like those found at <https://openapi.tools/>.
This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

## The `openapi` folder

* `entrypoint_ess.yaml` is the overview file which pulls together the paths and components that are not captured from the runtime OAS (e.g. the `encrypted_saved_objects/_rotate_key` route). Saved object routes themselves are generated from runtime OAS and are not duplicated here.
* [Paths](paths/README.md): this defines each endpoint. A path can have one operation per http method.

## Tools

To validate and bundle the docs, you can use [Redocly](https://redocly.com/docs/cli/) and [Swagger/OpenAPI CLI](https://www.npmjs.com/package/swagger-cli).


Generate the `bundled_ess` files by running the following commands:

```bash
npx @redocly/cli bundle entrypoint_ess.yaml --output bundled_ess.yaml --ext yaml
npx @redocly/cli bundle entrypoint_ess.yaml --output bundled_ess.json --ext json
```

Then join these files with the rest of the Kibana APIs per `oas_docs/README.md`
