/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Markdown as SharedUXMarkdown } from '@kbn/shared-ux-markdown';

const Markdown = (props: Parameters<typeof SharedUXMarkdown>[0]) => (
  <SharedUXMarkdown {...props} readOnly enableSoftLineBreaks />
);

export const initialSection = (
  <Markdown
    markdownContent={i18n.translate('languageDocumentation.documentationESQL.markdown', {
      defaultMessage: `
An ES|QL (Elasticsearch query language) query consists of a series of commands, separated by pipe characters: \`|\`. Each query starts with a **source command**, which produces a table, typically with data from Elasticsearch.

A source command can be followed by one or more **processing commands**. Processing commands can change the output table of the previous command by adding, removing, and changing rows and columns.

\`\`\`
source-command
| processing-command1
| processing-command2
\`\`\`

The result of a query is the table produced by the final processing command.
                                      `,
    })}
  />
);

export const sourceCommands = {
  label: i18n.translate('languageDocumentation.documentationESQL.sourceCommands', {
    defaultMessage: 'Source commands',
  }),
  description: i18n.translate('languageDocumentation.documentationESQL.commandsDescription', {
    defaultMessage: `A source command produces a table, typically with data from Elasticsearch. ES|QL supports the following source commands.`,
  }),
  items: [
    {
      label: i18n.translate('languageDocumentation.documentationESQL.from', {
        defaultMessage: 'FROM',
      }),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate('languageDocumentation.documentationESQL.from.markdown', {
            defaultMessage: `### FROM
The \`FROM\` source command returns a table with up to 10,000 documents from a data stream, index, or alias. Each row in the resulting table represents a document. Each column corresponds to a field, and can be accessed by the name of that field.

\`\`\`
FROM employees
\`\`\`

You can use [date math](https://www.elastic.co/guide/en/elasticsearch/reference/current/api-conventions.html#api-date-math-index-names) to refer to indices, aliases and data streams. This can be useful for time series data.

Use comma-separated lists or wildcards to query multiple data streams, indices, or aliases:

\`\`\`
FROM employees-00001,employees-*
\`\`\`

#### Metadata

ES|QL can access the following metadata fields:

* \`_index\`: the index to which the document belongs. The field is of the type \`keyword\`.
* \`_id\`: the source document's ID. The field is of the type \`keyword\`.
* \`_version\`: the source document's version. The field is of the type \`long\`.

Use the \`METADATA\` directive to enable metadata fields:

\`\`\`
FROM index METADATA _index, _id
\`\`\`

Metadata fields are only available if the source of the data is an index. Consequently, \`FROM\` is the only source commands that supports the \`METADATA\` directive.

Once enabled, the fields are then available to subsequent processing commands, just like the other index fields:

\`\`\`
FROM ul_logs, apps METADATA _index, _version
| WHERE id IN (13, 14) AND _version == 1
| EVAL key = CONCAT(_index, "_", TO_STR(id))
| SORT id, _index
| KEEP id, _index, _version, key
\`\`\`

Also, similar to the index fields, once an aggregation is performed, a metadata field will no longer be accessible to subsequent commands, unless used as grouping field:

\`\`\`
FROM employees METADATA _index, _id
| STATS max = MAX(emp_no) BY _index
\`\`\`
            `,
            description:
              'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
          })}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.row', {
        defaultMessage: 'ROW',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate('languageDocumentation.documentationESQL.row.markdown', {
            defaultMessage: `### ROW
The \`ROW\` source command produces a row with one or more columns with values that you specify. This can be useful for testing.

\`\`\`
ROW a = 1, b = "two", c = null
\`\`\`

Use square brackets to create multi-value columns:

\`\`\`
ROW a = [2, 1]
\`\`\`

ROW supports the use of functions:

\`\`\`
ROW a = ROUND(1.23, 0)
\`\`\`
            `,
            description:
              'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
          })}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.show', {
        defaultMessage: 'SHOW',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate('languageDocumentation.documentationESQL.show.markdown', {
            defaultMessage: `### SHOW
The \`SHOW <item>\` source command returns information about the deployment and its capabilities:

* Use \`SHOW INFO\` to return the deployment's version, build date and hash.
* Use \`SHOW FUNCTIONS\` to return a list of all supported functions and a synopsis of each function.
            `,
            ignoreTag: true,
            description:
              'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
          })}
        />
      ),
    },
  ],
};

export const processingCommands = {
  label: i18n.translate('languageDocumentation.documentationESQL.processingCommands', {
    defaultMessage: 'Processing commands',
  }),
  description: i18n.translate(
    'languageDocumentation.documentationESQL.processingCommandsDescription',
    {
      defaultMessage: `Processing commands change an input table by adding, removing, or changing rows and columns. ES|QL supports the following processing commands.`,
    }
  ),
  items: [
    {
      label: i18n.translate('languageDocumentation.documentationESQL.dissect', {
        defaultMessage: 'DISSECT',
      }),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.dissect.markdown',
            {
              defaultMessage: `### DISSECT
\`DISSECT\` enables you to extract structured data out of a string. \`DISSECT\` matches the string against a delimiter-based pattern, and extracts the specified keys as columns.

Refer to the [dissect processor documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/dissect-processor.html) for the syntax of dissect patterns.

\`\`\`
ROW a = "1953-01-23T12:15:00Z - some text - 127.0.0.1"
| DISSECT a "%'\{Y\}-%\{M\}-%\{D\}T%\{h\}:%\{m\}:%\{s\}Z - %\{msg\} - %\{ip\}'"
\`\`\`            `,
              ignoreTag: true,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.drop', {
        defaultMessage: 'DROP',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate('languageDocumentation.documentationESQL.drop.markdown', {
            defaultMessage: `### DROP
Use \`DROP\` to remove columns from a table:

\`\`\`
FROM employees
| DROP height
\`\`\`

Rather than specify each column by name, you can use wildcards to drop all columns with a name that matches a pattern:

\`\`\`
FROM employees
| DROP height*
\`\`\`
            `,
            description:
              'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
          })}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.enrich', {
        defaultMessage: 'ENRICH',
      }),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.enrich.markdown',
            {
              defaultMessage: `### ENRICH
You can use \`ENRICH\` to add data from your existing indices to incoming records. It’s similar to [ingest enrich](https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest-enriching-data.html), but it works at query time.

\`\`\`
ROW language_code = "1"
| ENRICH languages_policy
\`\`\`

\`ENRICH\` requires an [enrich policy](https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest-enriching-data.html#enrich-policy) to be executed. The enrich policy defines a match field (a key field) and a set of enrich fields.

\`ENRICH\` will look for records in the [enrich index](https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest-enriching-data.html#enrich-index) based on the match field value. The matching key in the input dataset can be defined using \`ON <field-name>\`; if it’s not specified, the match will be performed on a field with the same name as the match field defined in the enrich policy.

\`\`\`
ROW a = "1"
| ENRICH languages_policy ON a
\`\`\`

You can specify which attributes (between those defined as enrich fields in the policy) have to be added to the result, using \`WITH <field1>, <field2>...\` syntax.

\`\`\`
ROW a = "1"
| ENRICH languages_policy ON a WITH language_name
\`\`\`

Attributes can also be renamed using \`WITH new_name=<field1>\`

\`\`\`
ROW a = "1"
| ENRICH languages_policy ON a WITH name = language_name
\`\`\`

By default (if no \`WITH\` is defined), \`ENRICH\` will add all the enrich fields defined in the enrich policy to the result.

In case of name collisions, the newly created fields will override the existing fields.
            `,
              ignoreTag: true,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.eval', {
        defaultMessage: 'EVAL',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate('languageDocumentation.documentationESQL.eval.markdown', {
            defaultMessage: `### EVAL
\`EVAL\` enables you to add new columns:

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| EVAL height_feet = height * 3.281, height_cm = height * 100
\`\`\`

If the specified column already exists, the existing column will be dropped, and the new column will be appended to the table:

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| EVAL height = height * 3.281
\`\`\`

#### Functions
\`EVAL\` supports various functions for calculating values. Refer to Functions for more information.
            `,
            description:
              'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
          })}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.grok', {
        defaultMessage: 'GROK',
      }),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate('languageDocumentation.documentationESQL.grok.markdown', {
            defaultMessage: `### GROK
\`GROK\` enables you to extract structured data out of a string. \`GROK\` matches the string against patterns, based on regular expressions, and extracts the specified patterns as columns.

Refer to the [grok processor documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/grok-processor.html) for the syntax of grok patterns.

\`\`\`
ROW a = "12 15.5 15.6 true"
| GROK a "%'{NUMBER:b:int}' %'{NUMBER:c:float}' %'{NUMBER:d:double}' %'{WORD:e:boolean}'"
\`\`\`
            `,
            description:
              'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
          })}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.keep', {
        defaultMessage: 'KEEP',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate('languageDocumentation.documentationESQL.keep.markdown', {
            defaultMessage: `### KEEP
The \`KEEP\` command enables you to specify what columns are returned and the order in which they are returned.

To limit the columns that are returned, use a comma-separated list of column names. The columns are returned in the specified order:

\`\`\`
FROM employees
| KEEP first_name, last_name, height
\`\`\`

Rather than specify each column by name, you can use wildcards to return all columns with a name that matches a pattern:

\`\`\`
FROM employees
| KEEP h*
\`\`\`

The asterisk wildcard (\`*\`) by itself translates to all columns that do not match the other arguments. This query will first return all columns with a name that starts with an h, followed by all other columns:

\`\`\`
FROM employees
| KEEP h*, *
\`\`\`
            `,
            description:
              'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
          })}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.limit', {
        defaultMessage: 'LIMIT',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.limit.markdown',
            {
              defaultMessage: `### LIMIT
The \`LIMIT\` processing command enables you to limit the number of rows:

\`\`\`
FROM employees
| LIMIT 5
\`\`\`
            `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.lookupJoin', {
        defaultMessage: 'LOOKUP JOIN',
      }),
      preview: true,
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.lookupJoin.markdown',
            {
              defaultMessage: `### LOOKUP JOIN
You can use \`LOOKUP JOIN\` to add data from an existing index to incoming rows. While this is similar to \`ENRICH\`, it does not require an enrich policy to be executed beforehand. Additionally, if multiple matching documents are found in the lookup index, they will generate multiple output rows.

\`\`\`
ROW language_code = 1
| LOOKUP JOIN languages ON language_code
\`\`\`

An index that is used in \`LOOKUP JOIN\` needs to be in lookup mode. To create a lookup index, set the index mode to lookup.

\`\`\`
PUT languages
'{
  "settings": {
    "index":{
      "mode":"lookup"
    }
  }
}'
\`\`\`

The join key field must have a compatible type and match the name of the field in the lookup index to find matching documents. You can use \`RENAME\` or \`EVAL\` to rename columns as needed.

\`\`\`
FROM employees
| EVAL language_code = languages
| LOOKUP JOIN languages ON language_code
\`\`\`

In case of name collisions, the fields from the lookup index will override the existing fields.
            `,
              ignoreTag: true,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.mvExpand', {
        defaultMessage: 'MV_EXPAND',
      }),
      preview: true,
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.mvExpand.markdown',
            {
              defaultMessage: `### MV_EXPAND
The \`MV_EXPAND\` processing command expands multivalued fields into one row per value, duplicating other fields:
\`\`\`
ROW a=[1,2,3], b="b", j=["a","b"]
| MV_EXPAND a
\`\`\`
            `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.rename', {
        defaultMessage: 'RENAME',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.rename.markdown',
            {
              defaultMessage: `### RENAME
Use \`RENAME\` to rename a column using the following syntax:

\`\`\`
RENAME <old-name> AS <new-name>
\`\`\`

For example:

\`\`\`
FROM employees
| KEEP first_name, last_name, still_hired
| RENAME still_hired AS employed
\`\`\`

If a column with the new name already exists, it will be replaced by the new column.

Multiple columns can be renamed with a single \`RENAME\` command:

\`\`\`
FROM employees
| KEEP first_name, last_name
| RENAME first_name AS fn, last_name AS ln
\`\`\`
            `,
              ignoreTag: true,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.sort', {
        defaultMessage: 'SORT',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate('languageDocumentation.documentationESQL.sort.markdown', {
            defaultMessage: `### SORT
Use the \`SORT\` command to sort rows on one or more fields:

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| SORT height
\`\`\`

The default sort order is ascending. Set an explicit sort order using \`ASC\` or \`DESC\`:

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| SORT height DESC
\`\`\`

If two rows have the same sort key, the original order will be preserved. You can provide additional sort expressions to act as tie breakers:

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| SORT height DESC, first_name ASC
\`\`\`

#### \`null\` values
By default, \`null\` values are treated as being larger than any other value. With an ascending sort order, \`null\` values are sorted last, and with a descending sort order, \`null\` values are sorted first. You can change that by providing \`NULLS FIRST\` or \`NULLS LAST\`:

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| SORT first_name ASC NULLS FIRST
\`\`\`
            `,
            description:
              'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
          })}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.statsby', {
        defaultMessage: 'STATS ... BY',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.statsby.markdown',
            {
              defaultMessage: `### STATS ... BY
Use \`STATS ... BY\` to group rows according to a common value and calculate one or more aggregated values over the grouped rows.

**Examples**:

\`\`\`
FROM employees
| STATS count = COUNT(emp_no) BY languages
| SORT languages
\`\`\`

If \`BY\` is omitted, the output table contains exactly one row with the aggregations applied over the entire dataset:

\`\`\`
FROM employees
| STATS avg_lang = AVG(languages)
\`\`\`

It's possible to calculate multiple values:

\`\`\`
FROM employees
| STATS avg_lang = AVG(languages), max_lang = MAX(languages)
\`\`\`

It's also possible to group by multiple values (only supported for long and keyword family fields):

\`\`\`
FROM employees
| EVAL hired = DATE_FORMAT(hire_date, "YYYY")
| STATS avg_salary = AVG(salary) BY hired, languages.long
| EVAL avg_salary = ROUND(avg_salary)
| SORT hired, languages.long
\`\`\`

Refer to **Aggregation functions** for a list of functions that can be used with \`STATS ... BY\`.

Both the aggregating functions and the grouping expressions accept other functions. This is useful for using \`STATS...BY\` on multivalue columns. For example, to calculate the average salary change, you can use \`MV_AVG\` to first average the multiple values per employee, and use the result with the \`AVG\` function:

\`\`\`
FROM employees
| STATS avg_salary_change = AVG(MV_AVG(salary_change))
\`\`\`

An example of grouping by an expression is grouping employees on the first letter of their last name:

\`\`\`
FROM employees
| STATS my_count = COUNT() BY LEFT(last_name, 1)
| SORT \`LEFT(last_name, 1)\`
\`\`\`

Specifying the output column name is optional. If not specified, the new column name is equal to the expression. The following query returns a column named \`AVG(salary)\`:

\`\`\`
FROM employees
| STATS AVG(salary)
\`\`\`

Because this name contains special characters, it needs to be quoted with backticks (\`) when using it in subsequent commands:

\`\`\`
FROM employees
| STATS AVG(salary)
| EVAL avg_salary_rounded = ROUND(\`AVG(salary)\`)
\`\`\`

**Note**: \`STATS\` without any groups is much faster than adding a group.

**Note**: Grouping on a single expression is currently much more optimized than grouping on many expressions.
            `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.where', {
        defaultMessage: 'WHERE',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.where.markdown',
            {
              defaultMessage: `### WHERE
Use \`WHERE\` to produce a table that contains all the rows from the input table for which the provided condition evaluates to \`true\`:

\`\`\`
FROM employees
| KEEP first_name, last_name, still_hired
| WHERE still_hired == true
\`\`\`

#### Operators

Refer to **Operators** for an overview of the supported operators.

#### Functions
\`WHERE\` supports various functions for calculating values. Refer to **Functions** for more information.
            `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
  ],
};

export const operators = {
  label: i18n.translate('languageDocumentation.documentationESQL.operators', {
    defaultMessage: 'Operators',
  }),
  description: i18n.translate(
    'languageDocumentation.documentationESQL.operatorsDocumentationESQLDescription',
    {
      defaultMessage: `ES|QL supports the following operators:`,
    }
  ),
  items: [
    {
      label: i18n.translate('languageDocumentation.documentationESQL.binaryOperators', {
        defaultMessage: 'Binary operators',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.binaryOperators.markdown',
            {
              defaultMessage: `### Binary operators
These binary comparison operators are supported:

* equality: \`==\`
* inequality: \`!=\`
* less than: \`<\`
* less than or equal: \`<=\`
* greater than: \`>\`
* greater than or equal: \`>=\`
* add: \`+\`
* subtract: \`-\`
* multiply: \`*\`
* divide: \`/\`
* modulus: \`%\`
              `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.booleanOperators', {
        defaultMessage: 'Boolean operators',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.booleanOperators.markdown',
            {
              defaultMessage: `### Boolean operators
The following boolean operators are supported:

* \`AND\`
* \`OR\`
* \`NOT\`
              `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.castOperator', {
        defaultMessage: 'Cast (::)',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.castOperator.markdown',
            {
              defaultMessage: `### CAST (\`::\`)
The \`::\` operator provides a convenient alternative syntax to the \`TO_<type>\` type conversion functions.

Example:
\`\`\`
ROW ver = CONCAT(("0"::INT + 1)::STRING, ".2.3")::VERSION
\`\`\`
              `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              ignoreTag: true,
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.inOperator', {
        defaultMessage: 'IN',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.inOperator.markdown',
            {
              defaultMessage: `### IN
The \`IN\` operator allows testing whether a field or expression equals an element in a list of literals, fields or expressions:

\`\`\`
ROW a = 1, b = 4, c = 3
| WHERE c-a IN (3, b / 2, a)
\`\`\`
              `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.stringOperators', {
        defaultMessage: 'LIKE and RLIKE',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.stringOperators.markdown',
            {
              defaultMessage: `### LIKE and RLIKE
For string comparison using wildcards or regular expressions, use \`LIKE\` or \`RLIKE\`:

Use \`LIKE\` to match strings using wildcards. The following wildcard characters are supported:

* \`*\` matches zero or more characters.
* \`?\` matches one character.

\`\`\`
FROM employees
| WHERE first_name LIKE "?b*"
| KEEP first_name, last_name
\`\`\`

Use \`RLIKE\` to match strings using regular expressions:

\`\`\`
FROM employees
| WHERE first_name RLIKE ".leja.*"
| KEEP first_name, last_name
\`\`\`
              `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('languageDocumentation.documentationESQL.predicates', {
        defaultMessage: 'NULL values',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'languageDocumentation.documentationESQL.predicates.markdown',
            {
              defaultMessage: `### NULL values
For NULL comparison use the \`IS NULL\` and \`IS NOT NULL\` predicates:

\`\`\`
FROM employees
| WHERE birth_date IS NULL
| KEEP first_name, last_name
| SORT first_name
| LIMIT 3
\`\`\`

\`\`\`
FROM employees
| WHERE is_rehired IS NOT NULL
| STATS count(emp_no)
\`\`\`
              `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
  ],
};

export { functions as scalarFunctions } from './generated/scalar_functions';
export { functions as aggregationFunctions } from './generated/aggregation_functions';
export { functions as groupingFunctions } from './generated/grouping_functions';
