# @kbn/esql-utils

Utilities for building, inspecting, and executing ES|QL queries in Kibana.
This package focuses on common query manipulations and metadata extraction,
not full ES|QL parsing.

## Key exports

### Query helpers
- `getESQLAdHocDataview` - Build an ad-hoc data view from an ES|QL query.
- `getIndexPatternFromESQLQuery` - Read the index pattern from the `from` command.
- `getESQLWithSafeLimit` - Apply a safe default `limit` if none is present.
- `replaceESQLQueryIndexPattern` - Swap the `from` index pattern in-place.
- `getLookupIndicesFromQuery` - Return unique lookup indices referenced in the query.

### Parsing and inspection
- `getLimitFromESQLQuery` - Extract the explicit or default limit for a query.
- `getTimeFieldFromESQLQuery` - Find the time field used in the query (if any).
- `retrieveMetadataColumns` - Read metadata column names from the `from` command.
- `hasTransformationalCommand` - Check if the query changes the row/column shape.
- `getQuerySummary` - Produce a summarized view of query characteristics.

### Query building
- `appendToESQLQuery` - Append pipes to an existing query.
- `appendWhereClauseToESQLQuery` - Add a `where` clause.
- `appendLimitToQuery` - Add or replace a `limit` clause.
- `appendStatsByToQuery` - Add `stats by` aggregation syntax.

### Running queries
- `getESQLResults` - Execute an ES|QL query through the provided client.
- `formatESQLColumns` - Format ES|QL columns for UI consumption.
- `getStartEndParams` - Extract time range params used by the query.

### Callbacks (editor integrations)
- `getESQLSources` - Fetch sources for the editor.
- `getEsqlColumns` - Fetch columns for a query.
- `getEditorExtensions` - Provide editor extensions for ES|QL.

## Notes
- These utilities are shared across Kibana plugins and server routes.
- If you need a specific export, check `src/index.ts` for the full list.
