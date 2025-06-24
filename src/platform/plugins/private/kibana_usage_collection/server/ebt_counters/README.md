# Event-based Telemetry Success Counters (server-side)

Using the Usage Counters API, it reports the stats coming from the `core.analytics.telemetryCounters$` observable. It allows us to track the success of the EBT client on the server side.

## Field mappings

As the number of fields available in the Usage API is reduced, this collection merges some fields to be able to report it.

| Usage Counter field | Telemetry Counter fields                                                                         |
|---------------------|--------------------------------------------------------------------------------------------------|
| `domainId`          | Concatenation of the string `'ebt_counters.'` and the `source` (`'client'` or the shipper name). |
| `counterName`       | Matches the `eventType`.                                                                         |
| `counterType`       | Concatenation of the `type` and the `code` (i.e.: `'succeeded_200'`).                            |
| `total`             | Matches the value in `count`.                                                                    |