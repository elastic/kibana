# @kbn/manifest

This package contains a CLI to list `kibana.jsonc` manifests and also to mass update their properties.

## Usage

To list all `kibana.jsonc` manifests, run the following command from the root of the Kibana repo:

```sh
node scripts/manifest --list all
```

To print a manifest by packageId or by pluginId, run the following command from the root of the Kibana repo:

```sh
node scripts/manifest --package @kbn/package_name
node scripts/manifest --plugin pluginId
```

To update properties in one or more manifest files, run the following command from the root of the Kibana repo:

```sh
node scripts/manifest \
--package @kbn/package_1 \
--package @kbn/package_2 \
# ...
--package @kbn/package_N \
--set path.to.property1=value \
--set property2=value
```
