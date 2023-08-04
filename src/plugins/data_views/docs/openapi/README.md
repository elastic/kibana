# OpenAPI (Experimental)

The current self-contained spec file and can be used for online tools like those found at <https://openapi.tools/>.
This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

## Tools

It is possible to validate the docs before bundling them with the following
command:

```bash
npx swagger-cli validate entrypoint.yaml
```

Then you can generate the `bundled` files by running the following commands:

```bash
npx @redocly/cli bundle entrypoint.yaml --output bundled.yaml --ext yaml
npx @redocly/cli bundle entrypoint.yaml --output bundled.json --ext json
```

After generating the json bundle ensure that it is also valid by running the following command:

```bash
npx @redocly/cli lint bundled.json
```
