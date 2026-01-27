/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Template data for ESQL command documentation
// The generate_esql_command_docs.ts script will convert this to TSX with React components

export const sourceCommandsIntro = {
  labelKey: 'languageDocumentation.documentationESQL.sourceCommands',
  labelDefaultMessage: 'Source commands',
  descriptionKey: 'languageDocumentation.documentationESQL.commandsDescription',
  descriptionDefaultMessage: `A source command produces a table, typically with data from Elasticsearch. ES|QL supports the following source commands.`,
};

export const sourceCommandsItems = [
  {
    name: 'from',
    labelDefaultMessage: 'FROM',
    descriptionDefaultMessage: `### FROM
The \`FROM\` source command returns a table with up to 10,000 documents from a data stream, index, or alias. Each row in the resulting table represents a document. Each column corresponds to a field, and can be accessed by the name of that field.

\`\`\` esql
FROM employees
\`\`\`

You can use [date math](https://www.elastic.co/guide/en/elasticsearch/reference/current/api-conventions.html#api-date-math-index-names) to refer to indices, aliases and data streams. This can be useful for time series data.

Use comma-separated lists or wildcards to query multiple data streams, indices, or aliases:

\`\`\` esql
FROM employees-00001,employees-*
\`\`\`

#### Metadata

ES|QL can access the following metadata fields:

* \`_index\`: the index to which the document belongs. The field is of the type \`keyword\`.
* \`_id\`: the source document's ID. The field is of the type \`keyword\`.
* \`_version\`: the source document's version. The field is of the type \`long\`.

Use the \`METADATA\` directive to enable metadata fields:

\`\`\` esql
FROM index METADATA _index, _id
\`\`\`

Metadata fields are only available if the source of the data is an index. Consequently, \`FROM\` is the only source commands that supports the \`METADATA\` directive.

Once enabled, the fields are then available to subsequent processing commands, just like the other index fields:

\`\`\` esql
FROM ul_logs, apps METADATA _index, _version
| WHERE id IN (13, 14) AND _version == 1
| EVAL key = CONCAT(_index, "_", TO_STR(id))
| SORT id, _index
| KEEP id, _index, _version, key
\`\`\`

Also, similar to the index fields, once an aggregation is performed, a metadata field will no longer be accessible to subsequent commands, unless used as grouping field:

\`\`\` esql
FROM employees METADATA _index, _id
| STATS max = MAX(emp_no) BY _index
\`\`\`
            `,
    descriptionOptions: {
      description:
        'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
    },
    openLinksInNewTab: true,
  },
  {
    name: 'row',
    labelDefaultMessage: 'ROW',
    descriptionDefaultMessage: `### ROW
The \`ROW\` source command produces a row with one or more columns with values that you specify. This can be useful for testing.

\`\`\` esql
ROW a = 1, b = "two", c = null
\`\`\`

Use square brackets to create multi-value columns:

\`\`\` esql
ROW a = [2, 1]
\`\`\`

ROW supports the use of functions:

\`\`\` esql
ROW a = ROUND(1.23, 0)
\`\`\`
            `,
    descriptionOptions: {
      description:
        'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
    },
  },
  {
    name: 'show',
    labelDefaultMessage: 'SHOW',
    descriptionDefaultMessage: `### SHOW
The \`SHOW INFO\` source command returns the deployment's version, build date and hash.
            `,
    descriptionOptions: {
      ignoreTag: true,
      description:
        'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
    },
  },
  {
    name: 'ts',
    labelDefaultMessage: 'TS',
    descriptionDefaultMessage: `### TS
\`TS\` is similar to [\`FROM\`](/reference/query-languages/esql/commands/from.md), with the following key differences:

 - It targets only [time series data streams](https://www.elastic.co/docs/manage-data/data-store/data-streams/time-series-data-stream-tsds).
 - It enables the use of [time series aggregation functions](https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/time-series-aggregation-functions) inside the
   \`STATS\` command.

[time series aggregation functions](https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/time-series-aggregation-functions) to the \`STATS\` command.

\`\`\` esql
TS index_pattern [METADATA fields]
\`\`\`

**Parameters**

\`index_pattern\`
:   A list of indices, data streams or aliases. Supports wildcards and date math.

\`fields\`
:   A comma-separated list of [metadata fields](https://www.elastic.co/docs/reference/query-languages/esql/esql-metadata-fields) to retrieve.

**Description**

The \`TS\` source command enables time series semantics and adds support for
[time series aggregation functions](https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/time-series-aggregation-functions) to the \`STATS\` command, such as
[\`AVG_OVER_TIME()\`](https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/time-series-aggregation-functions#esql-avg_over_time),
or [\`RATE()\`](https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/time-series-aggregation-functions#esql-rate).
These functions are implicitly evaluated per time series, then aggregated by group using a secondary aggregation
function. For example:

\`\`\`esql
TS metrics
  | WHERE @timestamp >= now() - 1 hour
  | STATS SUM(RATE(search_requests)) BY TBUCKET(1 hour), host
\`\`\`

This query calculates the total rate of search requests (tracked by the \`search_requests\` counter) per host and hour. The \`RATE()\`
function is applied per time series in hourly buckets. These rates are summed for each
host and hourly bucket (since each host can map to multiple time series).

This paradigm—a pair of aggregation functions—is standard for time series
querying. For supported inner (time series) functions per
[metric type](https://www.elastic.co/docs/manage-data/data-store/data-streams/time-series-data-stream-tsds#time-series-metric), refer to
[time series aggregation functions](https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/time-series-aggregation-functions). These functions also
apply to downsampled data, with the same semantics as for raw data.

NOTE:
If a query is missing an inner (time series) aggregation function,
[\`LAST_OVER_TIME()\`](https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/time-series-aggregation-functions#esql-last_over_time)
is assumed and used implicitly. For instance, the following two queries are
equivalent, returning the average of the last memory usage values per time series:

\`\`\`esql
TS metrics | STATS AVG(memory_usage)

TS metrics | STATS AVG(LAST_OVER_TIME(memory_usage))
\`\`\`

To calculate the average memory usage across per-time-series averages, use
the following query:

\`\`\`esql
TS metrics | STATS AVG(AVG_OVER_TIME(memory_usage))
\`\`\`

Use regular (non-time-series)
[aggregation functions](https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/aggregation-functions),
such as \`SUM()\`, as outer aggregation functions. Using a time series aggregation
in combination with an inner function causes an error. For example, the
following query is invalid:

\`\`\`esql
TS metrics | STATS AVG_OVER_TIME(RATE(memory_usage))
\`\`\`

NOTE:
A [time series](https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/time-series-aggregation-functions)
aggregation function must be wrapped inside a
[regular](https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/aggregation-functions)
aggregation function. For instance, the following query is invalid:

\`\`\`esql
TS metrics | STATS RATE(search_requests)
\`\`\`

**Best practices**

- Avoid aggregating multiple metrics in the same query when those metrics have different dimensional cardinalities.
  For example, in \`STATS max(rate(foo)) + rate(bar))\`, if \`foo\` and \`bar\` don't share the same dimension values, the rate
  for one metric will be null for some dimension combinations. Because the + operator returns null when either input
  is null, the entire result becomes null for those dimensions. Additionally, queries that aggregate a single metric
  can filter out null values more efficiently.
- Use the \`TS\` command for aggregations on time series data, rather than \`FROM\`. The \`FROM\` command is still available
  (for example, for listing document contents), but it's not optimized for procesing time series data and may produce
  unexpected results.
- The \`TS\` command can't be combined with certain operations (such as
  [\`FORK\`](https://www.elastic.co/docs/reference/query-languages/esql/commands/fork)) before the \`STATS\` command is applied. Once \`STATS\` is
  applied, you can process the tabular output with any applicable ES|QL operations.
- Add a time range filter on \`@timestamp\` to limit the data volume scanned and improve query performance.

**Examples**

\`\`\`esql
TS metrics
| WHERE @timestamp >= now() - 1 day
| STATS SUM(AVG_OVER_TIME(memory_usage)) BY host, TBUCKET(1 hour)
\`\`\`
            `,
    descriptionOptions: {
      description:
        'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
      ignoreTag: true,
    },
    openLinksInNewTab: true,
    preview: true,
  },
];
