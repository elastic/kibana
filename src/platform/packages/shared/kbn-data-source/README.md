# @kbn/data-source

Consumer-facing abstraction over data sources used by Discover, Lens, and Dashboards.

Decouples consumers from the specifics of where field/column metadata comes from
(Elasticsearch index pattern via `_field_caps`, vs. ES|QL query result), so apps
can render results, resolve filters, and persist state without branching on
query type.

Two implementations:

- `IndexPatternSource` — wraps a `DataView`. Used for DSL queries.
- `EsqlSource` — built directly from an ES|QL query and its result columns. Does
  not require or create a `DataView`.

Both satisfy the same `DataSource` interface so visualizations, table renderers,
and filter utilities can consume them interchangeably.
