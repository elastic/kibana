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
];
