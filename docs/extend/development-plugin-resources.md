---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-plugin-resources.html
---

# Plugin Resources [development-plugin-resources]

Here are some resources that are helpful for getting started with plugin development.


## Some light reading [_some_light_reading]

If you haven’t already, start with [*Getting started*](/extend/development-getting-started.md). If you are planning to add your plugin to the {{kib}} repo, read the [*Contributing*](/extend/contributing.md) guide, if you are building a plugin externally, read [*External plugin development*](/extend/external-plugin-development.md). In both cases, read up on our recommended [*Best practices*](/extend/development-best-practices.md).


## Creating an empty plugin [_creating_an_empty_plugin]

You can use the [Automatic plugin generator](/extend/plugin-tooling.md#automatic-plugin-generator) to get a basic structure for a new plugin. Plugins that are not part of the {{kib}} repo should be developed inside the `plugins` folder.  If you are building a new plugin to check in to the {{kib}} repo, you will choose between a few locations:

* [x-pack/plugins](https://github.com/elastic/kibana/tree/master/x-pack/plugins) for plugins related to subscription features
* [src/plugins](https://github.com/elastic/kibana/tree/master/src/plugins) for plugins related to free features
* [examples](https://github.com/elastic/kibana/tree/master/examples) for developer example plugins (these will not be included in the distributables)


## Elastic UI Framework [_elastic_ui_framework]

If you’re developing a plugin that has a user interface, take a look at our [Elastic UI Framework](https://elastic.github.io/eui). It documents the CSS and React components we use to build {{kib}}'s user interface.

You’re welcome to use these components, but be aware that they are rapidly evolving, and we might introduce breaking changes that will disrupt your plugin’s UI.


## TypeScript Support [_typescript_support]

We recommend your plugin code is written in [TypeScript](http://www.typescriptlang.org/). To enable TypeScript support, create a `tsconfig.json` file at the root of your plugin that looks something like this:

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

TypeScript code is automatically converted into JavaScript during development, but not in the distributable version of {{kib}}. If you use the [@kbn/plugin-helpers](https://github.com/elastic/kibana/blob/master/packages/kbn-plugin-helpers) to build your plugin, then your `.ts` and `.tsx` files will be permanently transpiled before your plugin is archived. If you have your own build process, make sure to run the TypeScript compiler on your source files and ship the compilation output so that your plugin will work with the distributable version of {{kib}}.


## Externally developed plugins [_externally_developed_plugins]

If you are building a plugin outside of the {{kib}} repo, read [*External plugin development*](/extend/external-plugin-development.md).

