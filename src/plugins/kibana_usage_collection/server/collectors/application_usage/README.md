# Application Usage

This collector reports the number of general clicks and minutes on screen for each registered application in Kibana.

The final payload matches the following contract:

```JSON
{
  "application_usage": {
    "application_ID": {
        "clicks_7_days": 10,
        "clicks_30_days": 100,
        "clicks_90_days": 300,
        "clicks_total": 600,
        "minutes_on_screen_7_days": 10.40,
        "minutes_on_screen_30_days": 20.0,
        "minutes_on_screen_90_days": 110.1,
        "minutes_on_screen_total": 112.5
    }
  }
}
```

Where `application_ID` matches the `id` registered when calling the method `core.application.register`.
This collection occurs by default for every application registered via the mentioned method and there is no need to do anything else to enable it or _opt-in_ for your plugin.

**Note to maintainers in the Kibana repo:** At the moment of writing, the `usageCollector.schema` is not updated automatically ([#70622](https://github.com/elastic/kibana/issues/70622)) so, if you are adding a new app to Kibana, you'll need to give the Kibana Telemetry team a heads up to update the mappings in the Telemetry Cluster accordingly.

## Developer notes

In order to keep the count of the events, this collector uses 2 Saved Objects:

1. `application_usage_transactional`: It stores each individually reported event (up to 90 days old). Grouped by `timestamp` and `appId`.
2. `application_usage_totals`: It stores the sum of all the events older than 90 days old per `appId`.

Both of them use the shared fields `appId: 'keyword'`, `numberOfClicks: 'long'` and `minutesOnScreen: 'float'`. `application_usage_transactional` also stores `timestamp: { type: 'date' }`.
but they are currently not added in the mappings because we don't use them for search purposes, and we need to be thoughtful with the number of mapped fields in the SavedObjects index ([#43673](https://github.com/elastic/kibana/issues/43673)).
