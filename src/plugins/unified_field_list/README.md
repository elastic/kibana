# unifiedFieldList

This Kibana plugin contains components and services for field list UI (as in fields sidebar on Discover and Lens pages).

---

## Components

* `<FieldStats .../>` - loads and renders stats (Top values, Histogram) for a data view field.

## Public Services

* `loadStats(...)` - returns the loaded field stats (can also work with Ad-hoc data views)

## Server APIs

* `/api/unified_field_list/field_stats` - returns the loaded field stats (except for Ad-hoc data views)

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
