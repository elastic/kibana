# @kbn/esql-controls-utils

Helpers for the ES|QL controls: reading the ES|QL controls of a presentation container, and the prefix a
variable carries in a query.

They live apart from `@kbn/esql-utils` because reading a container needs `@kbn/presentation-publishing`, and
`@kbn/esql-utils` is a dependency of lower level packages (`@kbn/data-source`, which the panel publishing contract
builds on) that must not depend on it.
