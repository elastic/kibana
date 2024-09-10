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
    markdownContent={i18n.translate(
      'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.markdown',
      {
        defaultMessage: `## ES|QL

An ES|QL (Elasticsearch query language) query consists of a series of commands, separated by pipe characters: \`|\`. Each query starts with a **source command**, which produces a table, typically with data from Elasticsearch. 

A source command can be followed by one or more **processing commands**. Processing commands can change the output table of the previous command by adding, removing, and changing rows and columns.

\`\`\`
source-command
| processing-command1
| processing-command2
\`\`\`

The result of a query is the table produced by the final processing command.                                  
                                      `,
      }
    )}
  />
);

export const sourceCommands = {
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.sourceCommands', {
    defaultMessage: 'Source commands',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.commandsDescription',
    {
      defaultMessage: `A source command produces a table, typically with data from Elasticsearch. ES|QL supports the following source commands.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.from',
        {
          defaultMessage: 'FROM',
        }
      ),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.from.markdown',
            {
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
FROM index [METADATA _index, _id]
\`\`\`

Metadata fields are only available if the source of the data is an index. Consequently, \`FROM\` is the only source commands that supports the \`METADATA\` directive.

Once enabled, the fields are then available to subsequent processing commands, just like the other index fields:

\`\`\`
FROM ul_logs, apps [METADATA _index, _version]
| WHERE id IN (13, 14) AND _version == 1
| EVAL key = CONCAT(_index, "_", TO_STR(id))
| SORT id, _index
| KEEP id, _index, _version, key
\`\`\`

Also, similar to the index fields, once an aggregation is performed, a metadata field will no longer be accessible to subsequent commands, unless used as grouping field:

\`\`\`
FROM employees [METADATA _index, _id]
| STATS max = MAX(emp_no) BY _index
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.row',
        {
          defaultMessage: 'ROW',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.row.markdown',
            {
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
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.show',
        {
          defaultMessage: 'SHOW',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.show.markdown',
            {
              defaultMessage: `### SHOW
The \`SHOW <item>\` source command returns information about the deployment and its capabilities:

* Use \`SHOW INFO\` to return the deployment's version, build date and hash.
* Use \`SHOW FUNCTIONS\` to return a list of all supported functions and a synopsis of each function.
            `,
              ignoreTag: true,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
  ],
};

export const processingCommands = {
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.processingCommands', {
    defaultMessage: 'Processing commands',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.processingCommandsDescription',
    {
      defaultMessage: `Processing commands change an input table by adding, removing, or changing rows and columns. ES|QL supports the following processing commands.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dissect',
        {
          defaultMessage: 'DISSECT',
        }
      ),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dissect.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.drop',
        {
          defaultMessage: 'DROP',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.drop.markdown',
            {
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
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.enrich',
        {
          defaultMessage: 'ENRICH',
        }
      ),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.enrich.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.eval',
        {
          defaultMessage: 'EVAL',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.eval.markdown',
            {
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
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.grok',
        {
          defaultMessage: 'GROK',
        }
      ),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.grok.markdown',
            {
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
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.keep',
        {
          defaultMessage: 'KEEP',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.keep.markdown',
            {
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
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.limit',
        {
          defaultMessage: 'LIMIT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.limit.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvExpand',
        {
          defaultMessage: 'MV_EXPAND',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvExpand.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.rename',
        {
          defaultMessage: 'RENAME',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.rename.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sort',
        {
          defaultMessage: 'SORT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sort.markdown',
            {
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
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.statsby',
        {
          defaultMessage: 'STATS ... BY',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.statsby.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.where',
        {
          defaultMessage: 'WHERE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.where.markdown',
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

export const aggregationFunctions = {
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.aggregationFunctions', {
    defaultMessage: 'Aggregation functions',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.aggregationFunctionsDocumentationESQLDescription',
    {
      defaultMessage: `These functions can by used with STATS...BY:`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.avgFunction',
        {
          defaultMessage: 'AVG',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.avgFunction.markdown',
            {
              defaultMessage: `### AVG
Returns the average of a numeric field.

\`\`\`
FROM employees
| STATS AVG(height)
\`\`\`

The expression can use inline functions. For example, to calculate the average over a multivalued column, first use \`MV_AVG\` to average the multiple values per row, and use the result with the \`AVG\` function:

\`\`\`
FROM employees
| STATS avg_salary_change = AVG(MV_AVG(salary_change))
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.countFunction',
        {
          defaultMessage: 'COUNT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.countFunction.markdown',
            {
              defaultMessage: `### COUNT
Returns the total number (count) of input values.

\`\`\`
FROM employees
| STATS COUNT(height)
\`\`\`

Can take any field type as input.

To count the number of rows, use \`COUNT()\` or \`COUNT(*)\`:

\`\`\`
FROM employees
| STATS count = COUNT(*) BY languages
| SORT languages DESC
\`\`\`

The expression can use inline functions. This example splits a string into multiple values using the \`SPLIT\` function and counts the values:

\`\`\`
ROW words="foo;bar;baz;qux;quux;foo"
| STATS word_count = COUNT(SPLIT(words, ";"))
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.countDistinctFunction',
        {
          defaultMessage: 'COUNT_DISTINCT',
        }
      ),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.countDistinctFunction.markdown',
            {
              defaultMessage: `### COUNT_DISTINCT
Counts the approximate number of distinct values.

\`\`\`
FROM hosts
| STATS COUNT_DISTINCT(ip0), COUNT_DISTINCT(ip1)
\`\`\`

The \`COUNT_DISTINCT\` function is approximate, based on the HyperLogLog++ algorithm. Refer to the [documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-cardinality-aggregation.html#_counts_are_approximate) for more information. The precision is configurable, using an optional second parameter. The maximum supported value is 40000. Thresholds above this number will have the same effect as a threshold of 40000. The default value is 3000.

\`\`\`
FROM hosts
| STATS COUNT_DISTINCT(ip0, 80000), COUNT_DISTINCT(ip1, 5)
\`\`\`

The expression can use inline functions. This example splits a string into multiple values using the \`SPLIT\` function and counts the unique values:

\`\`\`
ROW words="foo;bar;baz;qux;quux;foo"
| STATS distinct_word_count = COUNT_DISTINCT(SPLIT(words, ";"))
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.maxFunction',
        {
          defaultMessage: 'MAX',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.maxFunction.markdown',
            {
              defaultMessage: `### MAX
Returns the maximum value of a numeric expression.

\`\`\`
FROM employees
| STATS MAX(languages)
\`\`\`

The expression can use inline functions. For example, to calculate the maximum over an average of a multivalued column, use \`MV_AVG\` to first average the multiple values per row, and use the result with the \`MAX\` function:

\`\`\`
FROM employees
| STATS max_avg_salary_change = MAX(MV_AVG(salary_change))
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.medianFunction',
        {
          defaultMessage: 'MEDIAN',
        }
      ),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.medianFunction.markdown',
            {
              defaultMessage: `### MEDIAN
Returns the value that is greater than half of all values and less than half of all values, also known as the 50% \`PERCENTILE\`.

**NOTE:** Like \`PERCENTILE\`, \`MEDIAN\` is usually approximate, based on the TDigest algorithm.

**WARNING:** \`MEDIAN\` is also [non-deterministic](https://en.wikipedia.org/wiki/Nondeterministic_algorithm). This means you can get slightly different results using the same data.

Example:

\`\`\`
FROM employees
| STATS MEDIAN(salary), PERCENTILE(salary, 50)
\`\`\`

The expression can use inline functions. For example, to calculate the median of the maximum values of a multivalued column, first use \`MV_MAX\` to get the maximum value per row, and use the result with the \`MEDIAN\` function:

\`\`\`
FROM employees
| STATS median_max_salary_change = MEDIAN(MV_MAX(salary_change))
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.medianAbsoluteDeviationFunction',
        {
          defaultMessage: 'MEDIAN_ABSOLUTE_DEVIATION',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.medianAbsoluteDeviationFunction.markdown',
            {
              defaultMessage: `### MEDIAN_ABSOLUTE_DEVIATION
Returns the median absolute deviation, a measure of variability. It is a robust statistic, meaning that it is useful for describing data that may have outliers, or may not be normally distributed. For such data it can be more descriptive than the standard deviation.

It is calculated as the median of each data point’s deviation from the median of the entire sample. That is, for a random variable X, the median absolute deviation is \`median(|median(X) - X|)\`.

\`\`\`
FROM employees
| STATS MEDIAN(salary), MEDIAN_ABSOLUTE_DEVIATION(salary)
\`\`\`

NOTE: Like \`PERCENTILE\`, \`MEDIAN_ABSOLUTE_DEVIATION\` is usually approximate, based on the TDigest algorithm. \`MEDIAN_ABSOLUTE_DEVIATION\` is also non-deterministic. This means you can get slightly different results using the same data.

The expression can use inline functions. For example, to calculate the median absolute deviation of the maximum values of a multivalued column, first use \`MV_MAX\` to get the maximum value per row, and use the result with the \`MEDIAN_ABSOLUTE_DEVIATION\` function:

\`\`\`
FROM employees
| STATS m_a_d_max_salary_change = MEDIAN_ABSOLUTE_DEVIATION(MV_MAX(salary_change))
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.minFunction',
        {
          defaultMessage: 'MIN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.minFunction.markdown',
            {
              defaultMessage: `### MIN
Returns the minimum value of a numeric field.

\`\`\`
FROM employees
| STATS MIN(languages)
\`\`\`

The expression can use inline functions. For example, to calculate the minimum over an average of a multivalued column, use \`MV_AVG\` to first average the multiple values per row, and use the result with the \`MIN\` function:

\`\`\`
FROM employees
| STATS min_avg_salary_change = MIN(MV_AVG(salary_change))
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.percentileFunction',
        {
          defaultMessage: 'PERCENTILE',
        }
      ),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.percentileFunction.markdown',
            {
              defaultMessage: `### PERCENTILE
The value at which a certain percentage of observed values occur. For example, the 95th percentile is the value which is greater than 95% of the observed values and the 50th percentile is the \`MEDIAN\`.

\`\`\`
FROM employees
| STATS p0 = PERCENTILE(salary,  0)
     , p50 = PERCENTILE(salary, 50)
     , p99 = PERCENTILE(salary, 99)
\`\`\`

**NOTE**: \`PERCENTILE\` is usually approximate, based on the TDigest algorithm. 

**WARNING:** \`PERCENTILE\` is also [non-deterministic](https://en.wikipedia.org/wiki/Nondeterministic_algorithm). This means you can get slightly different results using the same data.

The expression can use inline functions. For example, to calculate a percentile of the maximum values of a multivalued column, first use \`MV_MAX\` to get the maximum value per row, and use the result with the \`PERCENTILE\` function:

\`\`\`
FROM employees
| STATS p80_max_salary_change = PERCENTILE(MV_MAX(salary_change), 80)
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stCentroidFunction',
        {
          defaultMessage: 'ST_CENTROID_AGG',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stCentroidFunction.markdown',
            {
              defaultMessage: `### ST_CENTROID_AGG
**WARNING: This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.**

Calculates the spatial centroid over a field with spatial point geometry type.

\`\`\`
FROM airports
| STATS centroid=ST_CENTROID_AGG(location)
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sumFunction',
        {
          defaultMessage: 'SUM',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sumFunction.markdown',
            {
              defaultMessage: `### SUM
Returns the sum of a numeric field.

\`\`\`
FROM employees
| STATS SUM(languages)
\`\`\`

The expression can use inline functions. For example, to calculate the sum of each employee’s maximum salary changes, apply the \`MV_MAX\` function to each row and then \`SUM\` the results:

\`\`\`
FROM employees
| STATS total_salary_changes = SUM(MV_MAX(salary_change))
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.valuesFunction',
        {
          defaultMessage: 'VALUES',
        }
      ),
      description: (
        <Markdown
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.valuesFunction.markdown',
            {
              defaultMessage: `### VALUES

**WARNING: Do not use \`VALUES\` on production environments. This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.**

Returns all values in a group as a multivalued field. The order of the returned values isn’t guaranteed. If you need the values returned in order use \`MV_SORT\`.

Accepts an expression of any type except \`geo_point\`, \`cartesian_point\`, \`geo_shape\`, or \`cartesian_shape\`.


Example:

\`\`\`
  FROM employees
| EVAL first_letter = SUBSTRING(first_name, 0, 1)
| STATS first_name=MV_SORT(VALUES(first_name)) BY first_letter
| SORT first_letter
\`\`\`

> _**WARNING:** This can use a significant amount of memory and ES|QL doesn’t yet grow aggregations beyond memory. So this aggregation will work until it is used to collect more values than can fit into memory. Once it collects too many values it will fail the query with a [Circuit Breaker Error](https://www.elastic.co/guide/en/elasticsearch/reference/current/circuit-breaker-errors.html)._

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

export const groupingFunctions = {
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.groupingFunctions', {
    defaultMessage: 'Grouping functions',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.groupingFunctionsDocumentationESQLDescription',
    {
      defaultMessage: `These grouping functions can be used with \`STATS...BY\`:`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.autoBucketFunction',
        {
          defaultMessage: 'BUCKET',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.autoBucketFunction.markdown',
            {
              defaultMessage: `### BUCKET
Creates groups of values - buckets - out of a datetime or numeric input. The size of the buckets can either be provided directly, or chosen based on a recommended count and values range.

\`BUCKET\` works in two modes: 

1. Where the size of the bucket is computed based on a buckets count recommendation (four parameters) and a range.
2. Where the bucket size is provided directly (two parameters).

Using a target number of buckets, a start of a range, and an end of a range, \`BUCKET\` picks an appropriate bucket size to generate the target number of buckets or fewer.

For example, requesting up to 20 buckets for a year will organize data into monthly intervals:

\`\`\`
FROM employees
| WHERE hire_date >= "1985-01-01T00:00:00Z" AND hire_date < "1986-01-01T00:00:00Z"
| STATS hire_date = MV_SORT(VALUES(hire_date)) BY month = BUCKET(hire_date, 20, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")
| SORT hire_date
\`\`\`

**NOTE**: The goal isn’t to provide the exact target number of buckets, it’s to pick a range that provides _at most_ the target number of buckets.

You can combine \`BUCKET\` with an aggregation to create a histogram:

\`\`\`
FROM employees
| WHERE hire_date >= "1985-01-01T00:00:00Z" AND hire_date < "1986-01-01T00:00:00Z"
| STATS hires_per_month = COUNT(*) BY month = BUCKET(hire_date, 20, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")
| SORT month
\`\`\`

**NOTE**: \`BUCKET\` does not create buckets that match zero documents. That’s why the previous example is missing \`1985-03-01\` and other dates.

Asking for more buckets can result in a smaller range. For example, requesting at most 100 buckets in a year results in weekly buckets:

\`\`\`
FROM employees
| WHERE hire_date >= "1985-01-01T00:00:00Z" AND hire_date < "1986-01-01T00:00:00Z"
| STATS hires_per_week = COUNT(*) BY week = BUCKET(hire_date, 100, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")
| SORT week
\`\`\`

**NOTE**: \`BUCKET\` does not filter any rows. It only uses the provided range to pick a good bucket size. For rows with a value outside of the range, it returns a bucket value that corresponds to a bucket outside the range. Combine \`BUCKET\` with \`WHERE\` to filter rows.

If the desired bucket size is known in advance, simply provide it as the second argument, leaving the range out:

\`\`\`
FROM employees
| WHERE hire_date >= "1985-01-01T00:00:00Z" AND hire_date < "1986-01-01T00:00:00Z"
| STATS hires_per_week = COUNT(*) BY week = BUCKET(hire_date, 1 week)
| SORT week
\`\`\`

**NOTE**: When providing the bucket size as the second parameter, it must be a time duration or date period.

\`BUCKET\` can also operate on numeric fields. For example, to create a salary histogram:

\`\`\`
FROM employees
| STATS COUNT(*) by bs = BUCKET(salary, 20, 25324, 74999)
| SORT bs
\`\`\`

Unlike the earlier example that intentionally filters on a date range, you rarely want to filter on a numeric range. You have to find the min and max separately. ES|QL doesn’t yet have an easy way to do that automatically.

The range can be omitted if the desired bucket size is known in advance. Simply provide it as the second argument:

\`\`\`
FROM employees
| WHERE hire_date >= "1985-01-01T00:00:00Z" AND hire_date < "1986-01-01T00:00:00Z"
| STATS c = COUNT(1) BY b = BUCKET(salary, 5000.)
| SORT b
\`\`\`

**NOTE**: When providing the bucket size as the second parameter, it must be of a **floating point type**.

Here's an example to create hourly buckets for the last 24 hours, and calculate the number of events per hour:

\`\`\`
FROM sample_data
| WHERE @timestamp >= NOW() - 1 day and @timestamp < NOW()
| STATS COUNT(*) BY bucket = BUCKET(@timestamp, 25, NOW() - 1 day, NOW())
\`\`\`

Here's an example  to create monthly buckets for the year 1985, and calculate the average salary by hiring month:

\`\`\`
FROM employees
| WHERE hire_date >= "1985-01-01T00:00:00Z" AND hire_date < "1986-01-01T00:00:00Z"
| STATS AVG(salary) BY bucket = BUCKET(hire_date, 20, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")
| SORT bucket
\`\`\`

\`BUCKET\` may be used in both the aggregating and grouping part of the \`STATS …​ BY …\`​ command, provided that in the aggregating part the function is **referenced by an alias defined in the grouping part**, or that it is invoked with the exact same expression.

For example:

\`\`\`
FROM employees
| STATS s1 = b1 + 1, s2 = BUCKET(salary / 1000 + 999, 50.) + 2 BY b1 = BUCKET(salary / 100 + 99, 50.), b2 = BUCKET(salary / 1000 + 999, 50.)
| SORT b1, b2
| KEEP s1, b1, s2, b2
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

export const operators = {
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.operators', {
    defaultMessage: 'Operators',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.operatorsDocumentationESQLDescription',
    {
      defaultMessage: `ES|QL supports the following operators:`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.binaryOperators',
        {
          defaultMessage: 'Binary operators',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.binaryOperators.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.booleanOperators',
        {
          defaultMessage: 'Boolean operators',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.booleanOperators.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.castOperator',
        {
          defaultMessage: 'Cast (::)',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.castOperator.markdown',
            {
              defaultMessage: `### CAST (\`::\`)
The \`::\` operator provides a convenient alternative syntax to the \`TO_<type>\` type conversion functions.

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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.inOperator',
        {
          defaultMessage: 'IN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.inOperator.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stringOperators',
        {
          defaultMessage: 'LIKE and RLIKE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stringOperators.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.predicates',
        {
          defaultMessage: 'NULL values',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.predicates.markdown',
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

export { scalarFunctions } from './generated/scalar_functions';
