# Kibana Telemetry Service

Telemetry allows Kibana features to have usage tracked in the wild. The general term "telemetry" refers to multiple things:

1. Integrating with the telemetry service to express how to collect usage data (Collecting).
2. Sending a payload of usage data up to Elastic's telemetry cluster, once per browser per day (Sending).
3. Viewing usage data in the Kibana instance of the telemetry cluster (Viewing).

You, the feature or plugin developer, mainly need to worry about the first meaning: collecting. To integrate with the telemetry services for usage collection of your feature, there are 2 steps:

1. Create a usage collector using a factory function
2. Register the usage collector with the Telemetry service

NOTE: To a lesser extent, there's also a need to update the telemetry payload of Kibana stats and telemetry cluster field mappings to include your fields. This part is typically handled not by you, the developer, but different maintainers of the telemetry cluster. Usually, this step just means talk to the Platform team and have them approve your data model or added fields.

## Creating and Registering Usage Collector

A usage collector object is an instance of a class called `UsageCollector`. A factory function on `server.usage.collectorSet` object allows you to create an instance of this class. All you need to provide is a `type` for organizing your fields, and a `fetch` method for returning your usage data. Then you need to make the Telemetry service aware of the collector by registering it.

Example:

```js
// create usage collector
const myCollector = server.usage.collectorSet.makeUsageCollector({
  type: MY_USAGE_TYPE,
  fetch: async callCluster => {

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
server.usage.collectorSet.register(myCollector);
```

Some background: The `callCluster` that gets passed to the `fetch` method is created in a way that's a bit tricky, to support multiple contexts the `fetch` method could be called. Your `fetch` method could get called as a result of an HTTP API request: in this case, the `callCluster` function wraps `callWithRequest`, and the request headers are expected to have read privilege on the entire `.kibana` index. The use case for this is stats pulled from a Kibana Metricbeat module, where the Beat calls Kibana's stats API in Kibana to invoke collection.

The fetch method also might be called through an internal background task on the Kibana server, which currently lives in the `kibana_monitoring` module of the X-Pack Monitoring plugin, that polls for data and uploads it to Elasticsearch through a bulk API exposed by the Monitoring plugin for Elasticsearch. In this case, the `callCluster` method will be the internal system user and will have read privilege over the entire `.kibana` index.

Note: there will be many cases where you won't need to use the `callCluster` function that gets passed in to your `fetch` method at all. Your feature might have an accumulating value in server memory, or read something from the OS.


Typically, a plugin will create the collector object and register it with the Telemetry service from the `init` method of the plugin definition, or a helper module called from `init`.

## Update the telemetry payload and telemetry cluster field mappings

There is a module in the telemetry service that creates the payload of data that gets sent up to the telemetry cluster. 

As of the time of this writing (pre-6.5.0) there are a few unpleasant realities with this module. Today, this module has to be aware of all the features that have integrated with it, which it does from hard-coding. It does this because at the time of creation, the payload implemented a designed model where X-Pack plugin info went together regardless if it was ES-specific or Kibana-specific. In hindsight, all the Kibana data could just be put together, X-Pack or not, which it could do in a generic way. This is a known problem and a solution will be implemented in an upcoming refactoring phase, as this would break the contract for model of data sent in the payload.

The second reality is that new fields added to the telemetry payload currently mean that telemetry cluster field mappings have to be updated, so they can be searched and aggregated in Kibana visualizations. This is also a short-term obligation. In the next refactoring phase, collectors will need to use a proscribed data model that eliminates maintenance of mappings in the telemetry cluster.

## Testing

There are a few ways you can test that your usage collector is working properly.

1. The `/api/stats?extended=true` HTTP API in Kibana (added in 6.4.0) will call the fetch methods of all the registered collectors, and add them to a stats object you can see in a browser or in curl. To test that your usage collector has been registered correctly and that it has the model of data you expected it to have, call that HTTP API manually and you should see a key in the `usage` object of the response named after your usage collector's `type` field. This method tests the Metricbeat scenario described above where `callCluster` wraps `callWithRequest`.
2. There is a dev script in x-pack that will give a sample of a payload of data that gets sent up to the telemetry cluster for the sending phase of telemetry. Collected data comes from:
    - The `.monitoring-*` indices, when Monitoring is enabled. Monitoring enhances the sent payload of telemetry by producing usage data potentially of multiple clusters that exist in the monitoring data. Monitoring data is time-based, and the time frame of collection is the last 15 minutes.
    - Live-pulled from ES API endpoints. This will get just real-time stats without context of historical data. ✳
    - The dev script in x-pack can be run on the command-line with:
      ```
      cd x-pack
      node scripts/api_debug.js telemetry --host=http://localhost:5601
      ```
      Where `http://localhost:5601` is a Kibana server running in dev mode. If needed, authentication and basePath info can be provided in the command as well.
3. In Dev mode, Kibana will send telemetry data to a staging telemetry cluster. Assuming you have access to the staging cluster, you can log in and check the latest documents for your new fields.
4. If you catch the network traffic coming from your browser when a telemetry payload is sent, you can examine the request payload body to see the data. This can be tricky as telemetry payloads are sent only once per day per browser. Use incognito mode or clear your localStorage data to force a telemetry payload.

✳ At the time of this writing, there is an open issue that in the sending phase, Kibana usage collectors are not "live-pulled" from Kibana API endpoints if Monitoring is disabled. The implementation on this depends on a new secure way to live-pull the data from the end-user's browser, as it would not be appropriate to supply only partial data if the logged-in user only has partial access to `.kibana`.

## FAQ

1. **Can telemetry track UI interactions, such as button click?**  
   Brief answer: no. Telemetry collection happens on the server-side so the usage data will only include information that the server-side is aware of. There is no generic way to do this today, but UI-interaction KPIs can be tracked with a custom server endpoint that gets called for tracking when the UI event happens.
2. **Does the telemetry service have a hook that I can call whenever some event happens in my feature?**  
   Brief answer: no. Telemetry collection is a fetch model, not a push model. Telemetry fetches info from your collector.
3. **How should I design my data model?**  
   Keep it simple, and keep it to a model that Kibana will be able to understand. In short, that means don't rely on nested fields (arrays with objects). Flat arrays, such as arrays of strings are fine.
4. **Can the telemetry payload include dynamic fields?**  
   Yes. When you talk to the Platform team about new fields being added, point out specifically which properties will have dynamic inner fields.
5. **If I accumulate an event counter in server memory, which my fetch method returns, won't it reset when the Kibana server restarts?**  
   Yes, but that is not a major concern. A visualization on such info might be a date histogram that gets events-per-second or something, which would be impacted by server restarts, so we'll have to offset the beginning of the time range when we detect that the latest metric is smaller than the earliest metric. That would be a pretty custom visualization, but perhaps future Kibana enhancements will be able to support that.
6. **Who can I talk to with more questions?**  
   The Kibana Platform team is the owner of the telemetry service. You can bring questions to them. You can also talk to Tim Sullivan, who created the Kibana telemetry service, or Chris Earle, who set up the telemetry cluster and AWS Lambas for the upstream prod and staging endpoints that recieve the data sent from end-user browsers.
