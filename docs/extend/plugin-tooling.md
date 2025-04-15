---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/plugin-tooling.html
---

# Plugin tooling [plugin-tooling]


### Automatic plugin generator [automatic-plugin-generator]

We recommend that you kick-start your plugin by generating it with the [{{kib}} Plugin Generator](https://github.com/elastic/kibana/tree/master/packages/kbn-plugin-generator). Run the following in the {{kib}} repo, and you will be asked a couple of questions, see some progress bars, and have a freshly generated plugin ready for you to play with in {{kib}}'s `plugins` folder.

```shell
node scripts/generate_plugin
```


### Plugin location [_plugin_location]

The {{kib}} directory must be named `kibana`, and your plugin directory should be located in the root of `kibana` in a `plugins` directory, for example:

```shell
.
└── kibana
    └── plugins
        ├── foo-plugin
        └── bar-plugin
```

## Build plugin distributable [_build_plugin_distributable]

::::{warning}
{{kib}} distributable is not shipped with `@kbn/optimizer` anymore. You need to pre-build your plugin for use in production.
::::


You can leverage [@kbn/plugin-helpers](https://github.com/elastic/kibana/blob/master/packages/kbn-plugin-helpers) to build a distributable archive for your plugin. The package transpiles the plugin code, adds polyfills, and links necessary js modules in the runtime. You don’t need to install the `plugin-helpers` dependency. If you created the plugin using `node scripts/generate_plugin` script, `package.json` is already pre-configured. To build your plugin run within your plugin folder:

```shell
yarn build
```

It will output a`zip` archive in `kibana/plugins/my_plugin_name/build/` folder.


## Install a plugin from archive [_install_a_plugin_from_archive]

See [How to install a plugin](/reference/kibana-plugins.md#install-plugin).


## Run {{kib}} with your plugin in dev mode [_run_kib_with_your_plugin_in_dev_mode]

If your plugin isn’t server only and contains `ui` in order for Kibana to pick the browser bundles you need to run `yarn dev --watch` in the plugin root folder at a dedicated terminal.

Then, in a second terminal, run `yarn start` at the {{kib}} root folder. Make sure {{kib}} found and bootstrapped your plugin by:

```shell
[INFO ][plugins-system.standard] Setting up […] plugins: […, myPluginName, …]
```


