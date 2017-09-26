# kibana-plugin-helpers

[![Apache License](https://img.shields.io/badge/license-apache_2.0-a9215a.svg)](https://raw.githubusercontent.com/elastic/kibana-plugin-helpers/master/LICENSE)
[![CircleCI](https://img.shields.io/circleci/project/github/elastic/kibana-plugin-helpers.svg)](https://circleci.com/gh/elastic/kibana-plugin-helpers/tree/master)

Just some helpers for kibana plugin devs.

This simple CLI has several tasks that plugin devs can run from to easily debug, test, or package kibana plugins.

```sh
$ plugin-helpers help

  Usage: plugin-helpers [options] [command]

  Commands:

    start                       Start kibana and have it include this plugin
    build [options] [files...]  Build a distributable archive
    test                        Run the server and browser tests
    test:browser [options]      Run the browser tests in a real web browser
    test:server [files...]      Run the server tests using mocha

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

```

## Versions

Plugin Helpers | Kibana
-------------- | ------
7.x | 4.6+ (node 6+ only)
6.x | 4.6+
5.x | 4.x

## Configuration

`plugin-helpers` accepts a number of settings, which can be specified at runtime, or included in a `.kibana-plugin-helpers.json` file if you'd like to bundle those settings with your project. 

It will also observe a `.kibana-plugin-helpers.dev.json`, much like Kibana does, which we encourage you to add to your `.gitignore` file and use for local settings that you don't intend to share. These "dev" settings will override any settings in the normal json config.

All configuration setting listed below can simply can be included in the json config files. If you intend to inline the command, you will need to convert the setting to snake case (ie. `skipArchive` becomes `--skip-archive`).

### `start`

Setting | Description
------- | -----------
`includePlugins` | Intended to be used in a config file, an array of additional plugin paths to include, absolute or relative to the plugin root
`*` | Any options/flags included will be passed unmodified to the Kibana binary

### `build`

Setting | Description
------- | -----------
`skipArchive` | Don't create the zip file, leave the build path alone
`buildDestination` | Target path for the build output, absolute or relative to the plugin root
`buildVersion` | Version for the build output
`kibanaVersion` | Kibana version for the build output (added to package.json)
