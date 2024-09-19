# @kbn/eslint-import-resolver-kibana

Resolver for Kibana imports, meant to be used with [eslint-plugin-import](https://github.com/benmosher/eslint-plugin-import).

## Installation

To install this utility use `yarn` to link to the package from the Kibana project:

```sh
yarn add --dev link:../../kibana/packages/kbn-eslint-import-resolver-kibana
```

## Usage

Specify this resolver with the `import/resolver` setting in your eslint config file:

```yml
# .eslintrc.yml
settings:
  import/resolver: "@kbn/eslint-import-resolver-kibana"
```

## Settings

***NOTE:*** All relative paths are resolved as relative to the project root, which is determined by walking up from the first linted file and looking for a `package.json` file. If your project has multiple `package.json` files then make sure to specify the `rootPackageName` setting.

Property | Default | Description
-------- | ------- | -----------
rootPackageName | `null` | The `"name"` property of the root `package.json` file. If your project has multiple `package.json` files then specify this setting to tell the resolver which `package.json` file sits at the root of your project.
pluginPaths | `[]` if `rootPackageName` is set, otherwise `[.]` | Array of relative paths which contain a Kibana plugin. Plugins must contain a `package.json` file to be valid.
pluginDirs | `[]` | Array of relative paths pointing to directories which contain Kibana plugins. Plugins must contain a `package.json` file to be valid.
pluginMap | `{}` | A map of plugin ids to relative paths, explicitly pointing to the location where Kibana should map `plugin/{pluginId}` import statements. Directories do not need to contain a `package.json` file to work.

## Settings Usage
To specify additional config add a `:` after the resolver name and specify the argument as key-value pairs:

```yml
# .eslintrc.yml
settings:
  import/resolver:
    "@kbn/eslint-import-resolver-kibana":
      # if your project has multiple package.json files
      rootPackageName: my-project

      # if your project stores plugin source in sub directories you can specify
      # those directories via `pluginPaths`.
      pluginPaths:
        - ./plugin-one
        - ./plugin-two

      # if all of your plugins have the same parent directory you can specify
      # that directory and we will look for plugins there
      pluginDirs:
        - ./kibana-plugins

      # if you have some other special configuration supply a map of plugin
      # ids to the directory containing their code
      pluginMap:
        plugin1: plugins/plugin1
        plugin2: plugins/plugin2
```

See [the resolvers docs](https://github.com/benmosher/eslint-plugin-import#resolvers) or the [resolver spec](https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md#resolvesource-file-config---found-boolean-path-string-) for more details.

## Debugging

For debugging output from this resolver, run your linter with `DEBUG=eslint-plugin-import:resolver:kibana`.

This resolver defers to [*eslint-import-resolver-node*](https://www.npmjs.com/package/eslint-import-resolver-node) and [*eslint-import-resolver-webpack*](https://www.npmjs.com/package/eslint-import-resolver-webpack) for all of it's actual resolution logic. To get debugging output from all resolvers use `DEBUG=eslint-plugin-import:resolver:*`.
