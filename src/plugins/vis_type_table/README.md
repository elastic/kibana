Contains the data table visualization, that allows presenting data in a simple table format.

By default a new version of visualization will be used. To use the previous version of visualization the config must have the `vis_type_table.legacyVisEnabled: true` setting
configured in `kibana.dev.yml` or `kibana.yml`, as shown in the example below:

```yaml
vis_type_table.legacyVisEnabled: true
```