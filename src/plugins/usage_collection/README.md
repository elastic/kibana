# Kibana Usage Collection Service

Usage Collection allows collecting usage data for other services to consume (telemetry and monitoring).
To integrate with the telemetry services for usage collection of your feature, there are 2 steps:

1. Create a usage collector.
2. Register the usage collector.

## Creating and Registering Usage Collector

Your usage collector needs to provide 
- a `type` for organizing your fields, 
- `schema` field to define the expected types of usage fields reported, 
- a `fetch` method for returning your usage data, and
- an `isReady` method (that returns true or false) for letting the telemetry service know if it needs to wait for any asynchronous action (initialization of clients or other services) before calling the `fetch` method. 

Then you need to make the Telemetry service aware of the collector by registering it.

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
    import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
    import { CoreSetup, CoreStart } from 'src/core/server';

    class Plugin {
      public setup(core: CoreSetup, plugins: { usageCollection?: UsageCollectionSetup }) {
        registerMyPluginUsageCollector(plugins.usageCollection);
      }

      public start(core: CoreStart) {}
    }
    ```

3. Creating and registering a Usage Collector. Ideally collectors would be defined in a separate directory `server/collectors/register.ts`.
    ```ts
    // server/collectors/register.ts
    import { UsageCollectionSetup, CollectorFetchContext } from 'src/plugins/usage_collection/server';
    import { APICluster } from 'src/core/server';

    interface Usage {
      my_objects: {
        total: number,
      },
    }

    export function registerMyPluginUsageCollector(usageCollection?: UsageCollectionSetup): void {
      // usageCollection is an optional dependency, so make sure to return if it is not registered.
      if (!usageCollection) {
        return;
      }

      // create usage collector
      const myCollector = usageCollection.makeUsageCollector<Usage>({
        type: 'MY_USAGE_TYPE',
        schema: {
          my_objects: {
            total: 'long',
          },
        },
        isReady: () => isCollectorFetchReady, // Method to return `true`/`false` or Promise(`true`/`false`) to confirm if the collector is ready for the `fetch` method to be called.
        
        fetch: async (collectorFetchContext: CollectorFetchContext) => {

        // query ES or saved objects and get some data
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

Some background: 

- `MY_USAGE_TYPE` can be any string. It usually matches the plugin name. As a safety mechanism, we double check there are no duplicates at the moment of registering the collector.

- `isReady` (added in v7.2.0 and v6.8.4) is a way for a usage collector to announce that some async process must finish first before it can return data in the `fetch` method (e.g. a client needs to ne initialized, or the task manager needs to run a task first). If any collector reports that it is not ready when we call its `fetch` method, we reset a flag to try again and, after a set amount of time, collect data from those collectors that are ready and skip any that are not. This means that if a collector returns `true` for `isReady` and it actually isn't ready to return data, there won't be telemetry data from that collector in that telemetry report (usually once per day). You should consider what it means if your collector doesn't return data in the first few documents when Kibana starts or, if we should wait for any other reason (e.g. the task manager needs to run your task first). If you need to tell telemetry collection to wait, you should implement this function with custom logic. If your `fetch` method can run without the need of any previous dependencies, then you can return true for `isReady` as shown in the example below.

- The `fetch` method needs to support multiple contexts in which it is called. For example, when a user requests the example of what we collect in the **Kibana>Advanced Settings>Usage data** section, the clients provided in the context of the function (`CollectorFetchContext`) are scoped to that user's privileges. The reason is to avoid exposing via telemetry any data that user should not have access to (i.e.: if the user does not have access to certain indices, they shouldn't be allowed to see the number of documents that exists in it). In this case, the `fetch` method receives the clients `callCluster`, `esClient` and `soClient` scoped to the user who performed the HTTP API request. Alternatively, when requesting the usage data to be reported to the Remote Telemetry Service, the clients are scoped to the internal Kibana user (`kibana_system`). Please, mind it might have lower-level access than the default super-admin `elastic` test user.   
In some scenarios, your collector might need to maintain its own client. An example of that is the `monitoring` plugin, that maintains a connection to the Remote Monitoring Cluster to push its monitoring data. If that's the case, your plugin can opt-in to receive the additional `kibanaRequest` parameter by adding `extendFetchContext.kibanaRequest: true` to the collector's config: it will be appended to the context of the `fetch` method only if the request needs to be scoped to a user other than Kibana Internal, so beware that your collector will need to work for both scenarios (especially for the scenario when `kibanaRequest` is missing).

Note: there will be many cases where you won't need to use the `callCluster`, `esClient` or `soClient` function that gets passed in to your `fetch` method at all. Your feature might have an accumulating value in server memory, or read something from the OS.

In the case of using a custom SavedObjects client, it is up to the plugin to initialize the client to save the data and it is strongly recommended to scope that client to the `kibana_system` user.

```ts
// server/plugin.ts
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CoreSetup, CoreStart } from 'src/core/server';

class Plugin {
  private savedObjectsRepository?: ISavedObjectsRepository;

  public setup(core: CoreSetup, plugins: { usageCollection?: UsageCollectionSetup }) {
    registerMyPluginUsageCollector(plugins.usageCollection);
  }

  public start(core: CoreStart) {
    this.savedObjectsRepository = core.savedObjects.createInternalRepository();
  }
}
```

```ts
// server/collectors/register.ts
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

export function registerMyPluginUsageCollector(
  usageCollection?: UsageCollectionSetup
  ): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const myCollector = usageCollection.makeUsageCollector<Usage>(...)

  // register usage collector
  usageCollection.registerCollector(myCollector);
}
```

## Tracking interactions with incrementCounter
There are several ways to collect data that can provide insight into how users
use your plugin or specific features. For tracking user interactions the
`SavedObjectsRepository` provided by Core provides a useful `incrementCounter`
method which can be used to increment one or more counter fields in a
document. Examples of interactions include tracking:
 - the number of API calls
 - the number of times users installed and uninstalled the sample datasets 

When using `incrementCounter` for collecting usage data, you need to ensure
that usage collection happens on a best-effort basis and doesn't
negatively affect your plugin or users (see the example):
 - Swallow any exceptions thrown from the incrementCounter method and log
   a message in development.
 - Don't block your application on the incrementCounter method (e.g.
   don't use `await`)
 - Set the `refresh` option to false to prevent unecessary index refreshes
   which slows down Elasticsearch performance


Note: for brevity the following example does not follow Kibana's conventions
for structuring your plugin code.
```ts
// src/plugins/dashboard/server/plugin.ts

import { PluginInitializerContext, Plugin, CoreStart, CoreSetup } from '../../src/core/server';

export class DashboardPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly isDevEnvironment: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isDevEnvironment = initializerContext.env.cliArgs.dev;
  }
  public setup(core) {
    // Register a saved object type to store our usage counters
    core.savedObjects.registerType({
      // Don't expose this saved object type via the saved objects HTTP API
      hidden: true,
      mappings: {
        // Since we're not querying or aggregating over our counter documents
        // we don't define any fields.
        dynamic: false,
        properties: {},
      },
      name: 'dashboard_usage_counters',
      namespaceType: 'single',
    });
  }
  public start(core) {
    const repository = core.savedObjects.createInternalRepository(['dashboard_usage_counters']);
    // Initialize all the counter fields to 0 when our plugin starts
    // NOTE: Usage collection happens on a best-effort basis, so we don't
    // `await` the promise returned by `incrementCounter` and we swallow any
    // exceptions in production.
    repository
      .incrementCounter('dashboard_usage_counters', 'dashboard_usage_counters', [
        'apiCalls',
        'settingToggled',
      ], {refresh: false, initialize: true})
      .catch((e) => (this.isDevEnvironment ? this.logger.error(e) : e));

    const router = core.http.createRouter();

    router.post(
      {
        path: `api/v1/dashboard/counters/{counter}`,
        validate: {
          params: schema.object({
            counter: schema.oneOf([schema.literal('apiCalls'), schema.literal('settingToggled')]),
          }),
        },
      },
      async (context, request, response) => {
        request.params.id

        // NOTE: Usage collection happens on a best-effort basis, so we don't
        // `await` the promise returned by `incrementCounter` and we swallow any
        // exceptions in production.
        repository
          .incrementCounter('dashboard_usage_counters', 'dashboard_usage_counters', [
            counter
          ], {refresh: false})
          .catch((e) => (this.isDevEnvironement ? this.logger.error(e) : e));
    
        return response.ok();
      }
    );
  }
}

## Schema Field

The `schema` field is a proscribed data model assists with detecting changes in usage collector payloads. To define the collector schema add a schema field that specifies every possible field reported when registering the collector. Whenever the `schema` field is set or changed please run `node scripts/telemetry_check.js --fix` to update the stored schema json files.

### Allowed Schema Types

The `AllowedSchemaTypes` is the list of allowed schema types for the usage fields getting reported:

```
'long', 'integer', 'short', 'byte', 'double', 'float', 'keyword', 'text', 'boolean', 'date'
```

### Arrays

If any of your properties is an array, the schema definition must follow the convention below:

```
{ type: 'array', items: {...mySchemaDefinitionOfTheEntriesInTheArray} }
```

### Example

```ts
export const myCollector = makeUsageCollector<Usage>({
  type: 'my_working_collector',
  isReady: () => true, // `fetch` doesn't require any validation for dependencies to be met
  fetch() {
    return {
      my_greeting: 'hello',
      some_obj: {
        total: 123,
      },
      some_array: ['value1', 'value2'],
      some_array_of_obj: [{total: 123}],
    };
  },
  schema: {
    my_greeting: {
      type: 'keyword',
    },
    some_obj: {
      total: {
        type: 'long',
      },
    },
    some_array: {
      type: 'array',
      items: { type: 'keyword' }    
    },
    some_array_of_obj: {
      type: 'array',
      items: { 
        total: {
          type: 'long',
        },
      },   
    },
  },
});
```
## Update the telemetry payload and telemetry cluster field mappings

There is a module in the telemetry service that creates the payload of data that gets sent up to the telemetry cluster.

New fields added to the telemetry payload currently mean that telemetry cluster field mappings have to be updated, so they can be searched and aggregated in Kibana visualizations. This is also a short-term obligation. In the next refactoring phase, collectors will need to use a proscribed data model that eliminates maintenance of mappings in the telemetry cluster.

## Testing

There are a few ways you can test that your usage collector is working properly.

1. The `/api/stats?extended=true&legacy=true` HTTP API in Kibana (added in 6.4.0) will call the fetch methods of all the registered collectors, and add them to a stats object you can see in a browser or in curl. To test that your usage collector has been registered correctly and that it has the model of data you expected it to have, call that HTTP API manually and you should see a key in the `usage` object of the response named after your usage collector's `type` field. This method tests the Metricbeat scenario described above where `callCluster` wraps `callWithRequest`.
2. There is a dev script in x-pack that will give a sample of a payload of data that gets sent up to the telemetry cluster for the sending phase of telemetry. Collected data comes from:
    - The `.monitoring-*` indices, when Monitoring is enabled. Monitoring enhances the sent payload of telemetry by producing usage data potentially of multiple clusters that exist in the monitoring data. Monitoring data is time-based, and the time frame of collection is the last 15 minutes.
    - Live-pulled from ES API endpoints. This will get just real-time stats without context of historical data.
    - The dev script in x-pack can be run on the command-line with:

      ```shell
      cd x-pack
      node scripts/api_debug.js telemetry --host=http://localhost:5601
      ```

      Where `http://localhost:5601` is a Kibana server running in dev mode. If needed, authentication and basePath info can be provided in the command as well.
    - Automatic inclusion of all the stats fetched by collectors is added in [#22336](https://github.com/elastic/kibana/pull/22336) / 6.5.0
3. In Dev mode, Kibana will send telemetry data to a staging telemetry cluster. Assuming you have access to the staging cluster, you can log in and check the latest documents for your new fields.
4. If you catch the network traffic coming from your browser when a telemetry payload is sent, you can examine the request payload body to see the data. This can be tricky as telemetry payloads are sent only once per day per browser. Use incognito mode or clear your localStorage data to force a telemetry payload.

## FAQ

1. **How should I design my data model?**  
   Keep it simple, and keep it to a model that Kibana will be able to understand. In short, that means don't rely on nested fields (arrays with objects). Flat arrays, such as arrays of strings are fine.
2. **If I accumulate an event counter in server memory, which my fetch method returns, won't it reset when the Kibana server restarts?**  
   Yes, but that is not a major concern. A visualization on such info might be a date histogram that gets events-per-second or something, which would be impacted by server restarts, so we'll have to offset the beginning of the time range when we detect that the latest metric is smaller than the earliest metric. That would be a pretty custom visualization, but perhaps future Kibana enhancements will be able to support that.


# UI Metric app

UI_metric is deprecated in favor of UI Counters.

# UI Counters

## Purpose

UI Counters provides instrumentation in the UI to count triggered events such as component loaded, button clicked, or counting when an event occurs. It's useful for gathering _aggregate_ information, e.g. "How many times has Button X been clicked" or "How many times has Page Y been viewed".

With some finagling, it's even possible to add more meaning to the info you gather, such as "How many
visualizations were created in less than 5 minutes".

The events have a per day granularity.

## How to use it

To track a user interaction, use the `usageCollection.reportUiCounter` method exposed by the plugin `usageCollection` in the public side:

1. Similarly to the server-side usage collection, make sure `usageCollection` is in your optional Plugins:

    ```json
    // plugin/kibana.json
    {
      "id": "...",
      "optionalPlugins": ["usageCollection"]
    }
    ```

2. Register Usage collector in the `setup` function:

    ```ts
    // public/plugin.ts
    import { METRIC_TYPE } from '@kbn/analytics';

    class Plugin {
      setup(core, { usageCollection }) {
        if (usageCollection) {
          // Call the following method as many times as you want to report an increase in the count for this event
          usageCollection.reportUiCounter(`<AppName>`, METRIC_TYPE.CLICK, `<EventName>`);
        }
      }
    }
    ```

### Metric Types:

- `METRIC_TYPE.CLICK` for tracking clicks.
- `METRIC_TYPE.LOADED` for a component load, a page load, or a request load.
- `METRIC_TYPE.COUNT` is the generic counter for miscellaneous events.

Call this function whenever you would like to track a user interaction within your app. The function
accepts three arguments, `AppName`, `metricType` and `eventNames`. These should be underscore-delimited strings.

That's all you need to do!

### Reporting multiple events at once

To track multiple metrics within a single request, provide an array of events

```
usageCollection.reportUiCounter(`<AppName>`, METRIC_TYPE.CLICK, [`<EventName1>`, `<EventName2>`]);
```

### Increamenting counter by more than 1

To track an event occurance more than once in the same call, provide a 4th argument to the `reportUiCounter` function:

```
usageCollection.reportUiCounter(`<AppName>`, METRIC_TYPE.CLICK, `<EventName>`, 3);
```

### Disallowed characters

The colon character (`:`) should not be used in the app name. Colons play
a special role for `appName` in how metrics are stored as saved objects.

### Tracking timed interactions

If you want to track how long it takes a user to do something, you'll need to implement the timing
logic yourself. You'll also need to predefine some buckets into which the UI metric can fall.
For example, if you're timing how long it takes to create a visualization, you may decide to
measure interactions that take less than 1 minute, 1-5 minutes, 5-20 minutes, and longer than 20 minutes.
To track these interactions, you'd use the timed length of the interaction to determine whether to
use a `eventName` of  `create_vis_1m`, `create_vis_5m`, `create_vis_20m`, or `create_vis_infinity`.

# Routes registered by this plugin

- `/api/ui_counters/_report`: Used by `ui_metrics` and `ui_counters` usage collector instances to report their usage data to the server
- `/api/stats`: Get the metrics and usage ([details](./server/routes/stats/README.md))
