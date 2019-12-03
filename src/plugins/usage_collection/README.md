# Kibana Usage Collection Service

Usage Collection allows collecting usage data for other services to consume (telemetry and monitoring).
To integrate with the telemetry services for usage collection of your feature, there are 2 steps:

1. Create a usage collector.
2. Register the usage collector.

## Creating and Registering Usage Collector

All you need to provide is a `type` for organizing your fields, and a `fetch` method for returning your usage data. Then you need to make the Telemetry service aware of the collector by registering it.

### New Platform:

1. Make sure `usageCollection` is in your optional Plugins:

```json
// plugin/kibana.json
{
  "id": "...",
  "optionalPlugins": ["usageCollection"]
}
```

2. Register Usage collector in the `setup` function:

```ts
// server/plugin.ts
class Plugin {
  setup(core, plugins) {
    registerMyPluginUsageCollector(plugins.usageCollection);
  }
}
```

3. Creating and registering a Usage Collector. Ideally collectors would be defined in a separate directory `server/collectors/register.ts`.

```ts
// server/collectors/register.ts
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';

export function registerMyPluginUsageCollector(usageCollection?: UsageCollectionSetup): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const myCollector = usageCollection.makeUsageCollector({
    type: MY_USAGE_TYPE,
    fetch: async (callCluster: CallCluster) => {

    // query ES and get some data
    // summarize the data into a model
    // return the modeled object that includes whatever you want to track

      return {
        my_objects: {
          total: SOME_NUMBER
        }
      };
    },
  });

  // register usage collector
  usageCollection.registerCollector(myCollector);
}
```

Some background: The `callCluster` that gets passed to the `fetch` method is created in a way that's a bit tricky, to support multiple contexts the `fetch` method could be called. Your `fetch` method could get called as a result of an HTTP API request: in this case, the `callCluster` function wraps `callWithRequest`, and the request headers are expected to have read privilege on the entire `.kibana` index. The use case for this is stats pulled from a Kibana Metricbeat module, where the Beat calls Kibana's stats API in Kibana to invoke collection.

Note: there will be many cases where you won't need to use the `callCluster` function that gets passed in to your `fetch` method at all. Your feature might have an accumulating value in server memory, or read something from the OS.

### Migrating to NP from Legacy Plugins:

Pass `usageCollection` to the setup NP plugin setup function under plugins. Inside the `setup` function call the `registerCollector` like what you'd do in the NP example above.

```js
// index.js
export const myPlugin = (kibana: any) => {
  return new kibana.Plugin({
    init: async function (server) {
      const { usageCollection } = server.newPlatform.setup.plugins;
      const plugins = {
        usageCollection,
      };
      plugin(initializerContext).setup(core, plugins);
    }
  });
}
```

### Legacy Plugins:

Typically, a plugin will create the collector object and register it with the Telemetry service from the `init` method of the plugin definition, or a helper module called from `init`.

```js
// index.js
export const myPlugin = (kibana: any) => {
  return new kibana.Plugin({
    init: async function (server) {
      const { usageCollection } = server.newPlatform.setup.plugins;
      registerMyPluginUsageCollector(usageCollection);
    }
  });
}
```

## Update the telemetry payload and telemetry cluster field mappings

There is a module in the telemetry service that creates the payload of data that gets sent up to the telemetry cluster. 

New fields added to the telemetry payload currently mean that telemetry cluster field mappings have to be updated, so they can be searched and aggregated in Kibana visualizations. This is also a short-term obligation. In the next refactoring phase, collectors will need to use a proscribed data model that eliminates maintenance of mappings in the telemetry cluster.

## Testing

There are a few ways you can test that your usage collector is working properly.

1. The `/api/stats?extended=true` HTTP API in Kibana (added in 6.4.0) will call the fetch methods of all the registered collectors, and add them to a stats object you can see in a browser or in curl. To test that your usage collector has been registered correctly and that it has the model of data you expected it to have, call that HTTP API manually and you should see a key in the `usage` object of the response named after your usage collector's `type` field. This method tests the Metricbeat scenario described above where `callCluster` wraps `callWithRequest`.
2. There is a dev script in x-pack that will give a sample of a payload of data that gets sent up to the telemetry cluster for the sending phase of telemetry. Collected data comes from:
    - The `.monitoring-*` indices, when Monitoring is enabled. Monitoring enhances the sent payload of telemetry by producing usage data potentially of multiple clusters that exist in the monitoring data. Monitoring data is time-based, and the time frame of collection is the last 15 minutes.
    - Live-pulled from ES API endpoints. This will get just real-time stats without context of historical data.
    - The dev script in x-pack can be run on the command-line with:
      ```
      cd x-pack
      node scripts/api_debug.js telemetry --host=http://localhost:5601
      ```
      Where `http://localhost:5601` is a Kibana server running in dev mode. If needed, authentication and basePath info can be provided in the command as well.
    - Automatic inclusion of all the stats fetched by collectors is added in https://github.com/elastic/kibana/pull/22336 / 6.5.0
3. In Dev mode, Kibana will send telemetry data to a staging telemetry cluster. Assuming you have access to the staging cluster, you can log in and check the latest documents for your new fields.
4. If you catch the network traffic coming from your browser when a telemetry payload is sent, you can examine the request payload body to see the data. This can be tricky as telemetry payloads are sent only once per day per browser. Use incognito mode or clear your localStorage data to force a telemetry payload.

## FAQ

1. **How should I design my data model?**  
   Keep it simple, and keep it to a model that Kibana will be able to understand. In short, that means don't rely on nested fields (arrays with objects). Flat arrays, such as arrays of strings are fine.
2. **If I accumulate an event counter in server memory, which my fetch method returns, won't it reset when the Kibana server restarts?**  
   Yes, but that is not a major concern. A visualization on such info might be a date histogram that gets events-per-second or something, which would be impacted by server restarts, so we'll have to offset the beginning of the time range when we detect that the latest metric is smaller than the earliest metric. That would be a pretty custom visualization, but perhaps future Kibana enhancements will be able to support that.
