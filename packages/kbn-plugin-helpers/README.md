# @kbn/plugin-helpers

Just some helpers for kibana plugin devs.

## Installation

To install the plugin helpers just create the needed npm scripts on your plugin's `package.json` (as exemplified below) which 
is already the case if you use the new `node scripts/generate_plugin` script.

```json
{
  "scripts" : {
    "build": "yarn plugin-helpers build",
    "plugin-helpers": "node ../../scripts/plugin_helpers",
    "kbn": "node ../../scripts/kbn"
  }
}
```

This will make it possible to use the package from the repository into your plugin, but the `plugin-helpers` executable won't be available until you make sure you have run bootstrap at least once.

```sh
yarn kbn bootstrap
```

## Usage

This simple CLI has a build task that plugin devs can run from to easily package Kibana plugins.

Previously you could also use that tool to start and test your plugin. Currently you can run 
your plugin along with Kibana running `yarn start` in the Kibana repository root folder. Finally to test 
your plugin you should now configure and use your own tools.

```sh
$ plugin-helpers help

  Usage: plugin-helpers [command] [options]

  Commands:
      build
        Copies files from the source into a zip archive that can be distributed for
        installation into production Kibana installs. The archive includes the non-
        development npm dependencies and builds itself using raw files in the source
        directory so make sure they are clean/up to date. The resulting archive can
        be found at:
  
          build/{plugin.id}-{kibanaVersion}.zip
  
        Options:
          --skip-archive        Don't create the zip file, just create the build/kibana directory
          --kibana-version, -v  Kibana version that the
    

  Global options:
      --verbose, -v      Log verbosely
      --debug            Log debug messages (less than verbose)
      --quiet            Only log errors
      --silent           Don't log anything
      --help             Show this message

```

## Versions

The plugins helpers in the Kibana repo are available for Kibana 6.3 and greater. Just checkout the branch of Kibana you want to build against and the plugin helpers should be up to date for that version of Kibana.

When you're targeting versions before Kibana 6.3, use the `@elastic/plugin-helpers` from npm. See the [versions](https://github.com/elastic/kibana-plugin-helpers#versions) section of the [`@elastic/plugin-helpers` readme](https://github.com/elastic/kibana-plugin-helpers) for information about version compatibility.

## Configuration

`plugin-helpers` accepts a number of settings, which can be specified at runtime, or included in a `.kibana-plugin-helpers.json` file if you'd like to bundle those settings with your project.

It will also observe a `.kibana-plugin-helpers.dev.json`, much like Kibana does, which we encourage you to add to your `.gitignore` file and use for local settings that you don't intend to share. These "dev" settings will override any settings in the normal json config.

All configuration setting listed below can simply can be included in the json config files. If you intend to inline the command, you will need to convert the setting to snake case (ie. `skipArchive` becomes `--skip-archive`).

## Global settings

### Settings for `build`

Setting | Description
------- | -----------
`serverSourcePatterns` | Defines the files that are built with babel and written to your distributable for your server plugin. It is ignored if `kibana.json` has none `server: true` setting defined.
`skipArchive` | Don't create the zip file, leave the build path alone
`skipInstallDependencies` | Don't install dependencies defined in package.json into build output
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
