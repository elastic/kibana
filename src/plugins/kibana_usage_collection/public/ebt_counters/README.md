# Event-based Telemetry Success Counters (browser-side)

Using the UI Counters API, it reports the stats coming from the `core.analytics.telemetryCounters$` observable. It allows us to track the success of the EBT client on the browser.

## Field mappings

As the number of fields available in the Usage API is reduced, this collection merges some fields to be able to report it.

| UI Counter field | Telemetry Counter fields                                                                         |
|------------------|--------------------------------------------------------------------------------------------------|
| `appName`        | Concatenation of the string `'ebt_counters.'` and the `source` (`'client'` or the shipper name). |
| `eventName`      | Matches the `eventType`.                                                                         |
| `counterType`    | Concatenation of the `type` and the `code` (i.e.: `'succeeded_200'`).                            |
| `total`          | Matches the value in `count`.                                                                    |