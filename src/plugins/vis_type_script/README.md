## Description

This plugin defines the script-based visualization type. Users can use JavaScript and the popular D3 library to build script-based custom visualizations directly in Kibana.

## Setup

To use this plugin, you need to relax Kibana's default content security policy via `kibana.yml`. (This will no longer be necessary once issue [101579](https://github.com/elastic/kibana/issues/101579) is resolved.)

Add the following to `kibana.yml` (**DO NOT USE IN PRODUCTION**):

```yml
csp.warnLegacyBrowsers: false
csp.strict: false
csp.script_src:
  - 'unsafe-inline'
  - 'https://unpkg.com/'
```
