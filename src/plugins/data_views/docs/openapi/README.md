# OpenAPI (Experimental)

The current self-contained spec file is available as `bundled.json` or `bundled.yaml` and can be used for online tools like those found at <https://openapi.tools/>.
This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).


## The `openapi` folder

* `entrypoint.yaml` is the overview file which pulls together all the paths and components.
* [Paths](paths/README.md): Defines each endpoint.  A path can have one operation per http method.
* [Components](components/README.md): Defines reusable components.

## Tools

Generate the `bundled` files by running the following commands:

```bash
npx @redocly/cli bundle entrypoint.yaml --output bundled.yaml --ext yaml
npx @redocly/cli bundle entrypoint.yaml --output bundled.json --ext json
```

After generating the json bundle ensure that it is also valid by running the following command:

```bash
npx @redocly/cli lint bundled.json
```
