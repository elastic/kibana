# Config Usage Collector

The config usage collector reports non-default kibana configs.

All non-default configs except booleans and numbers will be reported as `[redacted]` unless otherwise specified via `config.exposeToUsage` in the plugin config descriptor.

```ts
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'src/core/server';

export const configSchema = schema.object({
  usageCounters: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    retryCount: schema.number({ defaultValue: 1 }),
    bufferDuration: schema.duration({ defaultValue: '5s' }),
  }),
  uiCounters: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    debug: schema.boolean({ defaultValue: schema.contextRef('dev') }),
  }),
  maximumWaitTimeForAllCollectorsInS: schema.number({
    defaultValue: DEFAULT_MAXIMUM_WAIT_TIME_FOR_ALL_COLLECTORS_IN_S,
  }),
});

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  exposeToUsage: {
    uiCounters: true,
    usageCounters: {
      bufferDuration: true,
    },
    maximumWaitTimeForAllCollectorsInS: false,
  },
};
```

In the above example setting `uiCounters: true` in the `exposeToUsage` property marks all configs
under the path `uiCounters` as safe. The collector will send the actual non-default config value
when setting an exact config or its parent path to `true`.

Settings the config path or its parent path to `false` will explicitly mark this config as unsafe.
The collector will send `[redacted]` for non-default configs
when setting an exact config or its parent path to `false`.

### Output of the collector

```json
{
  "kibana_config_usage": {
    "xpack.apm.serviceMapTraceIdBucketSize": 30,
    "elasticsearch.username": "[redacted]",
    "elasticsearch.password": "[redacted]",
    "plugins.paths": "[redacted]",
    "server.port": 5603,
    "server.basePath": "[redacted]",
    "server.rewriteBasePath": true,
    "logging.json": false,
    "usageCollection.uiCounters.debug": true
  }
}
```

Note that arrays of objects will be reported as `[redacted]` and cannot be explicitly marked as safe.