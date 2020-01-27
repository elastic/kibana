# @kbn/plugin-helpers

Just some helpers for kibana plugin devs.

## Installation

To install the plugin helpers use `yarn` to link to the package from the Kibana project:

```sh
yarn add --dev link:../../kibana/packages/kbn-plugin-helpers
```

This will link the package from the repository into your plugin, but the `plugin-helpers` executable won't be available in your project until you run bootstrap again.

```sh
yarn kbn bootstrap
```

## Usage

This simple CLI has several tasks that plugin devs can run from to easily debug, test, or package kibana plugins.

```sh
$ plugin-helpers help

  Usage: plugin-helpers [options] [command]

  Commands:

    start                       Start kibana and have it include this plugin
    build [options] [files...]  Build a distributable archive
    test                        Run the server and browser tests
    test:karma [options]      Run the browser tests in a real web browser
    test:mocha [files...]      Run the server tests using mocha

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

```

## Versions

The plugins helpers in the Kibana repo are available for Kibana 6.3 and greater. Just checkout the branch of Kibana you want to build against and the plugin helpers should be up to date for that version of Kibana.

When you're targeting versions before Kibana 6.3, use the `@elastic/plugin-helpers` from npm. See the [versions](https://github.com/elastic/kibana-plugin-helpers#versions) section of the [`@elastic/plugin-helpers` readme](https://github.com/elastic/kibana-plugin-helpers) for information about version compatibility.

## Configuration

`plugin-helpers` accepts a number of settings, which can be specified at runtime, or included in a `.kibana-plugin-helpers.json` file if you'd like to bundle those settings with your project.

It will also observe a `.kibana-plugin-helpers.dev.json`, much like Kibana does, which we encourage you to add to your `.gitignore` file and use for local settings that you don't intend to share. These "dev" settings will override any settings in the normal json config.

All configuration setting listed below can simply can be included in the json config files. If you intend to inline the command, you will need to convert the setting to snake case (ie. `skipArchive` becomes `--skip-archive`).

## Global settings

### Settings for `start`

Setting | Description
------- | -----------
`includePlugins` | Intended to be used in a config file, an array of additional plugin paths to include, absolute or relative to the plugin root
`*` | Any options/flags included will be passed unmodified to the Kibana binary

### Settings for `build`

Setting | Description
------- | -----------
`skipArchive` | Don't create the zip file, leave the build path alone
`buildDestination` | Target path for the build output, absolute or relative to the plugin root
`skipInstallDependencies` | Don't install dependencies defined in package.json into build output
`buildVersion` | Version for the build output
`kibanaVersion` | Kibana version for the build output (added to package.json)

## TypeScript support

Plugin code can be written in [TypeScript](http://www.typescriptlang.org/) if desired. To enable TypeScript support create a `tsconfig.json` file at the root of your plugin that looks something like this:

```js
{
  // extend Kibana's tsconfig, or use your own settings
  "extends": "../../kibana/tsconfig.json",

  // tell the TypeScript compiler where to find your source files
  "include": [
    "server/**/*",
    "public/**/*"
  ]
}
```
