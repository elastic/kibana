# @kbn/plugin-check

This package contains a CLI to detect inconsistencies between the manifest and Typescript types of a Kibana plugin.  Future work will include automatically fixing these inconsistencies.

## Usage

To check a single plugin, run the following command from the root of the Kibana repo:

```sh
node scripts/plugin_check --plugin pluginName
```

To check all plugins owned by a team, run the following:

```sh
node scripts/plugin_check --team @elastic/team_name
```
