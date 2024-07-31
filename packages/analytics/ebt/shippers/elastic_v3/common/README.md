# @kbn/ebt/shippers/elastic_v3/common

This package holds the common code for the Elastic V3 shippers:

- Types defining the Shipper configuration `ElasticV3ShipperOptions`
- `buildUrl` utility helps decide which URL to use depending on whether the shipper is configured to send to production or staging.
- `eventsToNdjson` utility converts any array of events to NDJSON format.
- `reportTelemetryCounters` helps with building the TelemetryCounter to emit after processing an event.

It should be considered an internal package and should not be used other than by the shipper implementations: `@kbn/ebt/shippers/elastic_v3/browser` and `@kbn/ebt/shippers/elastic_v3/server`
