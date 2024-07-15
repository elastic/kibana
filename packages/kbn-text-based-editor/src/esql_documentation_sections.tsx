/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

// DO NOT RENAME!
// managed by scripts/generate_esql_docs.ts
export const functions = {
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.functions', {
    defaultMessage: 'Functions',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.functionsDocumentationESQLDescription',
    {
      defaultMessage: `Functions are supported by ROW, EVAL and WHERE.`,
    }
  ),
  items: [
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.abs',
        {
          defaultMessage: 'ABS',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.abs.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ABS
  Returns the absolute value.

  \`\`\`
  ROW number = -1.0 
  | EVAL abs_number = ABS(number)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.acos',
        {
          defaultMessage: 'ACOS',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.acos.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ACOS
  Returns the arccosine of \`n\` as an angle, expressed in radians.

  \`\`\`
  ROW a=.9
  | EVAL acos=ACOS(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.asin',
        {
          defaultMessage: 'ASIN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.asin.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ASIN
  Returns the arcsine of the input
  numeric expression as an angle, expressed in radians.

  \`\`\`
  ROW a=.9
  | EVAL asin=ASIN(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.atan',
        {
          defaultMessage: 'ATAN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.atan.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ATAN
  Returns the arctangent of the input
  numeric expression as an angle, expressed in radians.

  \`\`\`
  ROW a=12.9
  | EVAL atan=ATAN(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.atan2',
        {
          defaultMessage: 'ATAN2',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.atan2.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ATAN2
  The angle between the positive x-axis and the ray from the
  origin to the point (x , y) in the Cartesian plane, expressed in radians.

  \`\`\`
  ROW y=12.9, x=.6
  | EVAL atan2=ATAN2(y, x)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.avg',
        {
          defaultMessage: 'AVG',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.avg.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### AVG
  The average of a numeric field.

  \`\`\`
  FROM employees
  | STATS AVG(height)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.bucket',
        {
          defaultMessage: 'BUCKET',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.bucket.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### BUCKET
  Creates groups of values - buckets - out of a datetime or numeric input.
  The size of the buckets can either be provided directly, or chosen based on a recommended count and values range.

  \`\`\`
  FROM employees
  | WHERE hire_date >= "1985-01-01T00:00:00Z" AND hire_date < "1986-01-01T00:00:00Z"
  | STATS hire_date = MV_SORT(VALUES(hire_date)) BY month = BUCKET(hire_date, 20, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")
  | SORT hire_date
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.case',
        {
          defaultMessage: 'CASE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.case.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### CASE
  Accepts pairs of conditions and values. The function returns the value that
  belongs to the first condition that evaluates to \`true\`.

  If the number of arguments is odd, the last argument is the default value which
  is returned when no condition matches. If the number of arguments is even, and
  no condition matches, the function returns \`null\`.

  \`\`\`
  FROM employees
  | EVAL type = CASE(
      languages <= 1, "monolingual",
      languages <= 2, "bilingual",
       "polyglot")
  | KEEP emp_no, languages, type
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cbrt',
        {
          defaultMessage: 'CBRT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cbrt.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### CBRT
  Returns the cube root of a number. The input can be any numeric value, the return value is always a double.
  Cube roots of infinities are null.

  \`\`\`
  ROW d = 1000.0
  | EVAL c = cbrt(d)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ceil',
        {
          defaultMessage: 'CEIL',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ceil.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### CEIL
  Round a number up to the nearest integer.

  \`\`\`
  ROW a=1.8
  | EVAL a=CEIL(a)
  \`\`\`
  Note: This is a noop for \`long\` (including unsigned) and \`integer\`. For \`double\` this picks the closest \`double\` value to the integer similar to Math.ceil.
  `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              ignoreTag: true,
            }
          )}
        />
      ),
    },
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cidr_match',
        {
          defaultMessage: 'CIDR_MATCH',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cidr_match.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### CIDR_MATCH
  Returns true if the provided IP is contained in one of the provided CIDR blocks.

  \`\`\`
  FROM hosts 
  | WHERE CIDR_MATCH(ip1, "127.0.0.2/32", "127.0.0.3/32") 
  | KEEP card, host, ip0, ip1
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.coalesce',
        {
          defaultMessage: 'COALESCE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.coalesce.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### COALESCE
  Returns the first of its arguments that is not null. If all arguments are null, it returns \`null\`.

  \`\`\`
  ROW a=null, b="b"
  | EVAL COALESCE(a, b)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.concat',
        {
          defaultMessage: 'CONCAT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.concat.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### CONCAT
  Concatenates two or more strings.

  \`\`\`
  FROM employees
  | KEEP first_name, last_name
  | EVAL fullname = CONCAT(first_name, " ", last_name)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cos',
        {
          defaultMessage: 'COS',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cos.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### COS
  Returns the cosine of an angle.

  \`\`\`
  ROW a=1.8 
  | EVAL cos=COS(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cosh',
        {
          defaultMessage: 'COSH',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cosh.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### COSH
  Returns the hyperbolic cosine of an angle.

  \`\`\`
  ROW a=1.8 
  | EVAL cosh=COSH(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.date_diff',
        {
          defaultMessage: 'DATE_DIFF',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.date_diff.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### DATE_DIFF
  Subtracts the \`startTimestamp\` from the \`endTimestamp\` and returns the difference in multiples of \`unit\`.
  If \`startTimestamp\` is later than the \`endTimestamp\`, negative values are returned.

  \`\`\`
  ROW date1 = TO_DATETIME("2023-12-02T11:00:00.000Z"), date2 = TO_DATETIME("2023-12-02T11:00:00.001Z")
  | EVAL dd_ms = DATE_DIFF("microseconds", date1, date2)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.date_extract',
        {
          defaultMessage: 'DATE_EXTRACT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.date_extract.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### DATE_EXTRACT
  Extracts parts of a date, like year, month, day, hour.

  \`\`\`
  ROW date = DATE_PARSE("yyyy-MM-dd", "2022-05-06")
  | EVAL year = DATE_EXTRACT("year", date)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.date_format',
        {
          defaultMessage: 'DATE_FORMAT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.date_format.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### DATE_FORMAT
  Returns a string representation of a date, in the provided format.

  \`\`\`
  FROM employees
  | KEEP first_name, last_name, hire_date
  | EVAL hired = DATE_FORMAT("YYYY-MM-dd", hire_date)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.date_parse',
        {
          defaultMessage: 'DATE_PARSE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.date_parse.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### DATE_PARSE
  Returns a date by parsing the second argument using the format specified in the first argument.

  \`\`\`
  ROW date_string = "2022-05-06"
  | EVAL date = DATE_PARSE("yyyy-MM-dd", date_string)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.date_trunc',
        {
          defaultMessage: 'DATE_TRUNC',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.date_trunc.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### DATE_TRUNC
  Rounds down a date to the closest interval.

  \`\`\`
  FROM employees
  | KEEP first_name, last_name, hire_date
  | EVAL year_hired = DATE_TRUNC(1 year, hire_date)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.e', {
        defaultMessage: 'E',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.e.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### E
  Returns Euler's number.

  \`\`\`
  ROW E()
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ends_with',
        {
          defaultMessage: 'ENDS_WITH',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ends_with.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ENDS_WITH
  Returns a boolean that indicates whether a keyword string ends with another string.

  \`\`\`
  FROM employees
  | KEEP last_name
  | EVAL ln_E = ENDS_WITH(last_name, "d")
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.floor',
        {
          defaultMessage: 'FLOOR',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.floor.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### FLOOR
  Round a number down to the nearest integer.

  \`\`\`
  ROW a=1.8
  | EVAL a=FLOOR(a)
  \`\`\`
  Note: This is a noop for \`long\` (including unsigned) and \`integer\`.
  For \`double\` this picks the closest \`double\` value to the integer
  similar to Math.floor.
  `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              ignoreTag: true,
            }
          )}
        />
      ),
    },
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.from_base64',
        {
          defaultMessage: 'FROM_BASE64',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.from_base64.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### FROM_BASE64
  Decode a base64 string.

  \`\`\`
  row a = "ZWxhc3RpYw==" 
  | eval d = from_base64(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.greatest',
        {
          defaultMessage: 'GREATEST',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.greatest.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### GREATEST
  Returns the maximum value from multiple columns. This is similar to \`MV_MAX\`
  except it is intended to run on multiple columns at once.

  \`\`\`
  ROW a = 10, b = 20
  | EVAL g = GREATEST(a, b)
  \`\`\`
  Note: When run on \`keyword\` or \`text\` fields, this returns the last string in alphabetical order. When run on \`boolean\` columns this will return \`true\` if any values are \`true\`.
  `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              ignoreTag: true,
            }
          )}
        />
      ),
    },
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ip_prefix',
        {
          defaultMessage: 'IP_PREFIX',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ip_prefix.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### IP_PREFIX
  Truncates an IP to a given prefix length.

  \`\`\`
  row ip4 = to_ip("1.2.3.4"), ip6 = to_ip("fe80::cae2:65ff:fece:feb9")
  | eval ip4_prefix = ip_prefix(ip4, 24, 0), ip6_prefix = ip_prefix(ip6, 0, 112);
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.least',
        {
          defaultMessage: 'LEAST',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.least.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### LEAST
  Returns the minimum value from multiple columns. This is similar to \`MV_MIN\` except it is intended to run on multiple columns at once.

  \`\`\`
  ROW a = 10, b = 20
  | EVAL l = LEAST(a, b)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.left',
        {
          defaultMessage: 'LEFT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.left.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### LEFT
  Returns the substring that extracts 'length' chars from 'string' starting from the left.

  \`\`\`
  FROM employees
  | KEEP last_name
  | EVAL left = LEFT(last_name, 3)
  | SORT last_name ASC
  | LIMIT 5
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.length',
        {
          defaultMessage: 'LENGTH',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.length.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### LENGTH
  Returns the character length of a string.

  \`\`\`
  FROM employees
  | KEEP first_name, last_name
  | EVAL fn_length = LENGTH(first_name)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.locate',
        {
          defaultMessage: 'LOCATE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.locate.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### LOCATE
  Returns an integer that indicates the position of a keyword substring within another string.

  \`\`\`
  row a = "hello"
  | eval a_ll = locate(a, "ll")
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.log',
        {
          defaultMessage: 'LOG',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.log.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### LOG
  Returns the logarithm of a value to a base. The input can be any numeric value, the return value is always a double.

  Logs of zero, negative numbers, and base of one return \`null\` as well as a warning.

  \`\`\`
  ROW base = 2.0, value = 8.0
  | EVAL s = LOG(base, value)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.log10',
        {
          defaultMessage: 'LOG10',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.log10.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### LOG10
  Returns the logarithm of a value to base 10. The input can be any numeric value, the return value is always a double.

  Logs of 0 and negative numbers return \`null\` as well as a warning.

  \`\`\`
  ROW d = 1000.0 
  | EVAL s = LOG10(d)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ltrim',
        {
          defaultMessage: 'LTRIM',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ltrim.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### LTRIM
  Removes leading whitespaces from a string.

  \`\`\`
  ROW message = "   some text  ",  color = " red "
  | EVAL message = LTRIM(message)
  | EVAL color = LTRIM(color)
  | EVAL message = CONCAT("'", message, "'")
  | EVAL color = CONCAT("'", color, "'")
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.max',
        {
          defaultMessage: 'MAX',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.max.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MAX
  The maximum value of a field.

  \`\`\`
  FROM employees
  | STATS MAX(languages)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.min',
        {
          defaultMessage: 'MIN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.min.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MIN
  The minimum value of a field.

  \`\`\`
  FROM employees
  | STATS MIN(languages)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_append',
        {
          defaultMessage: 'MV_APPEND',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_append.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_APPEND
  Concatenates values of two multi-value fields.

  `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              ignoreTag: true,
            }
          )}
        />
      ),
    },
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_avg',
        {
          defaultMessage: 'MV_AVG',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_avg.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_AVG
  Converts a multivalued field into a single valued field containing the average of all of the values.

  \`\`\`
  ROW a=[3, 5, 1, 6]
  | EVAL avg_a = MV_AVG(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_concat',
        {
          defaultMessage: 'MV_CONCAT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_concat.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_CONCAT
  Converts a multivalued string expression into a single valued column containing the concatenation of all values separated by a delimiter.

  \`\`\`
  ROW a=["foo", "zoo", "bar"]
  | EVAL j = MV_CONCAT(a, ", ")
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_count',
        {
          defaultMessage: 'MV_COUNT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_count.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_COUNT
  Converts a multivalued expression into a single valued column containing a count of the number of values.

  \`\`\`
  ROW a=["foo", "zoo", "bar"]
  | EVAL count_a = MV_COUNT(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_dedupe',
        {
          defaultMessage: 'MV_DEDUPE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_dedupe.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_DEDUPE
  Remove duplicate values from a multivalued field.

  \`\`\`
  ROW a=["foo", "foo", "bar", "foo"]
  | EVAL dedupe_a = MV_DEDUPE(a)
  \`\`\`
  Note: \`MV_DEDUPE\` may, but won't always, sort the values in the column.
  `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              ignoreTag: true,
            }
          )}
        />
      ),
    },
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_first',
        {
          defaultMessage: 'MV_FIRST',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_first.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_FIRST
  Converts a multivalued expression into a single valued column containing the
  first value. This is most useful when reading from a function that emits
  multivalued columns in a known order like \`SPLIT\`.

  The order that  multivalued fields are read from
  underlying storage is not guaranteed. It is *frequently* ascending, but don't
  rely on that. If you need the minimum value use \`MV_MIN\` instead of
  \`MV_FIRST\`. \`MV_MIN\` has optimizations for sorted values so there isn't a
  performance benefit to \`MV_FIRST\`.

  \`\`\`
  ROW a="foo;bar;baz"
  | EVAL first_a = MV_FIRST(SPLIT(a, ";"))
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_last',
        {
          defaultMessage: 'MV_LAST',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_last.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_LAST
  Converts a multivalue expression into a single valued column containing the last
  value. This is most useful when reading from a function that emits multivalued
  columns in a known order like \`SPLIT\`.

  The order that  multivalued fields are read from
  underlying storage is not guaranteed. It is *frequently* ascending, but don't
  rely on that. If you need the maximum value use \`MV_MAX\` instead of
  \`MV_LAST\`. \`MV_MAX\` has optimizations for sorted values so there isn't a
  performance benefit to \`MV_LAST\`.

  \`\`\`
  ROW a="foo;bar;baz"
  | EVAL last_a = MV_LAST(SPLIT(a, ";"))
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_max',
        {
          defaultMessage: 'MV_MAX',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_max.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_MAX
  Converts a multivalued expression into a single valued column containing the maximum value.

  \`\`\`
  ROW a=[3, 5, 1]
  | EVAL max_a = MV_MAX(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_median',
        {
          defaultMessage: 'MV_MEDIAN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_median.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_MEDIAN
  Converts a multivalued field into a single valued field containing the median value.

  \`\`\`
  ROW a=[3, 5, 1]
  | EVAL median_a = MV_MEDIAN(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_min',
        {
          defaultMessage: 'MV_MIN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_min.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_MIN
  Converts a multivalued expression into a single valued column containing the minimum value.

  \`\`\`
  ROW a=[2, 1]
  | EVAL min_a = MV_MIN(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_slice',
        {
          defaultMessage: 'MV_SLICE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_slice.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_SLICE
  Returns a subset of the multivalued field using the start and end index values.

  \`\`\`
  row a = [1, 2, 2, 3]
  | eval a1 = mv_slice(a, 1), a2 = mv_slice(a, 2, 3)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_sort',
        {
          defaultMessage: 'MV_SORT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_sort.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_SORT
  Sorts a multivalued field in lexicographical order.

  \`\`\`
  ROW a = [4, 2, -3, 2]
  | EVAL sa = mv_sort(a), sd = mv_sort(a, "DESC")
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_sum',
        {
          defaultMessage: 'MV_SUM',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_sum.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_SUM
  Converts a multivalued field into a single valued field containing the sum of all of the values.

  \`\`\`
  ROW a=[3, 5, 6]
  | EVAL sum_a = MV_SUM(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_zip',
        {
          defaultMessage: 'MV_ZIP',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mv_zip.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### MV_ZIP
  Combines the values from two multivalued fields with a delimiter that joins them together.

  \`\`\`
  ROW a = ["x", "y", "z"], b = ["1", "2"]
  | EVAL c = mv_zip(a, b, "-")
  | KEEP a, b, c
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.now',
        {
          defaultMessage: 'NOW',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.now.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### NOW
  Returns current date and time.

  \`\`\`
  ROW current_date = NOW()
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.pi', {
        defaultMessage: 'PI',
      }),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.pi.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### PI
  Returns Pi, the ratio of a circle's circumference to its diameter.

  \`\`\`
  ROW PI()
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.pow',
        {
          defaultMessage: 'POW',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.pow.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### POW
  Returns the value of \`base\` raised to the power of \`exponent\`.

  \`\`\`
  ROW base = 2.0, exponent = 2
  | EVAL result = POW(base, exponent)
  \`\`\`
  Note: It is still possible to overflow a double result here; in that case, null will be returned.
  `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              ignoreTag: true,
            }
          )}
        />
      ),
    },
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.repeat',
        {
          defaultMessage: 'REPEAT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.repeat.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### REPEAT
  Returns a string constructed by concatenating \`string\` with itself the specified \`number\` of times.

  \`\`\`
  ROW a = "Hello!"
  | EVAL triple_a = REPEAT(a, 3);
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.replace',
        {
          defaultMessage: 'REPLACE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.replace.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### REPLACE
  The function substitutes in the string \`str\` any match of the regular expression \`regex\`
  with the replacement string \`newStr\`.

  \`\`\`
  ROW str = "Hello World"
  | EVAL str = REPLACE(str, "World", "Universe")
  | KEEP str
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.right',
        {
          defaultMessage: 'RIGHT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.right.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### RIGHT
  Return the substring that extracts 'length' chars from 'str' starting from the right.

  \`\`\`
  FROM employees
  | KEEP last_name
  | EVAL right = RIGHT(last_name, 3)
  | SORT last_name ASC
  | LIMIT 5
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.round',
        {
          defaultMessage: 'ROUND',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.round.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ROUND
  Rounds a number to the specified number of decimal places.
  Defaults to 0, which returns the nearest integer. If the
  precision is a negative number, rounds to the number of digits left
  of the decimal point.

  \`\`\`
  FROM employees
  | KEEP first_name, last_name, height
  | EVAL height_ft = ROUND(height * 3.281, 1)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.rtrim',
        {
          defaultMessage: 'RTRIM',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.rtrim.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### RTRIM
  Removes trailing whitespaces from a string.

  \`\`\`
  ROW message = "   some text  ",  color = " red "
  | EVAL message = RTRIM(message)
  | EVAL color = RTRIM(color)
  | EVAL message = CONCAT("'", message, "'")
  | EVAL color = CONCAT("'", color, "'")
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.signum',
        {
          defaultMessage: 'SIGNUM',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.signum.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### SIGNUM
  Returns the sign of the given number.
  It returns \`-1\` for negative numbers, \`0\` for \`0\` and \`1\` for positive numbers.

  \`\`\`
  ROW d = 100.0
  | EVAL s = SIGNUM(d)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sin',
        {
          defaultMessage: 'SIN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sin.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### SIN
  Returns ths Sine trigonometric function of an angle.

  \`\`\`
  ROW a=1.8 
  | EVAL sin=SIN(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sinh',
        {
          defaultMessage: 'SINH',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sinh.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### SINH
  Returns the hyperbolic sine of an angle.

  \`\`\`
  ROW a=1.8 
  | EVAL sinh=SINH(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.split',
        {
          defaultMessage: 'SPLIT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.split.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### SPLIT
  Split a single valued string into multiple strings.

  \`\`\`
  ROW words="foo;bar;baz;qux;quux;corge"
  | EVAL word = SPLIT(words, ";")
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sqrt',
        {
          defaultMessage: 'SQRT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sqrt.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### SQRT
  Returns the square root of a number. The input can be any numeric value, the return value is always a double.
  Square roots of negative numbers and infinities are null.

  \`\`\`
  ROW d = 100.0
  | EVAL s = SQRT(d)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_contains',
        {
          defaultMessage: 'ST_CONTAINS',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_contains.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ST_CONTAINS
  Returns whether the first geometry contains the second geometry.
  This is the inverse of the \`ST_WITHIN\` function.

  \`\`\`
  FROM airport_city_boundaries
  | WHERE ST_CONTAINS(city_boundary, TO_GEOSHAPE("POLYGON((109.35 18.3, 109.45 18.3, 109.45 18.4, 109.35 18.4, 109.35 18.3))"))
  | KEEP abbrev, airport, region, city, city_location
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_disjoint',
        {
          defaultMessage: 'ST_DISJOINT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_disjoint.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ST_DISJOINT
  Returns whether the two geometries or geometry columns are disjoint.
  This is the inverse of the \`ST_INTERSECTS\` function.
  In mathematical terms: ST_Disjoint(A, B) ⇔ A ⋂ B = ∅

  \`\`\`
  FROM airport_city_boundaries
  | WHERE ST_DISJOINT(city_boundary, TO_GEOSHAPE("POLYGON((-10 -60, 120 -60, 120 60, -10 60, -10 -60))"))
  | KEEP abbrev, airport, region, city, city_location
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_distance',
        {
          defaultMessage: 'ST_DISTANCE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_distance.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ST_DISTANCE
  Computes the distance between two points.
  For cartesian geometries, this is the pythagorean distance in the same units as the original coordinates.
  For geographic geometries, this is the circular distance along the great circle in meters.

  \`\`\`
  FROM airports
  | WHERE abbrev == "CPH"
  | EVAL distance = ST_DISTANCE(location, city_location)
  | KEEP abbrev, name, location, city_location, distance
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_intersects',
        {
          defaultMessage: 'ST_INTERSECTS',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_intersects.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ST_INTERSECTS
  Returns true if two geometries intersect.
  They intersect if they have any point in common, including their interior points
  (points along lines or within polygons).
  This is the inverse of the \`ST_DISJOINT\` function.
  In mathematical terms: ST_Intersects(A, B) ⇔ A ⋂ B ≠ ∅

  \`\`\`
  FROM airports
  | WHERE ST_INTERSECTS(location, TO_GEOSHAPE("POLYGON((42 14, 43 14, 43 15, 42 15, 42 14))"))
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_within',
        {
          defaultMessage: 'ST_WITHIN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_within.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ST_WITHIN
  Returns whether the first geometry is within the second geometry.
  This is the inverse of the \`ST_CONTAINS\` function.

  \`\`\`
  FROM airport_city_boundaries
  | WHERE ST_WITHIN(city_boundary, TO_GEOSHAPE("POLYGON((109.1 18.15, 109.6 18.15, 109.6 18.65, 109.1 18.65, 109.1 18.15))"))
  | KEEP abbrev, airport, region, city, city_location
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_x',
        {
          defaultMessage: 'ST_X',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_x.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ST_X
  Extracts the \`x\` coordinate from the supplied point.
  If the points is of type \`geo_point\` this is equivalent to extracting the \`longitude\` value.

  \`\`\`
  ROW point = TO_GEOPOINT("POINT(42.97109629958868 14.7552534006536)")
  | EVAL x =  ST_X(point), y = ST_Y(point)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_y',
        {
          defaultMessage: 'ST_Y',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.st_y.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### ST_Y
  Extracts the \`y\` coordinate from the supplied point.
  If the points is of type \`geo_point\` this is equivalent to extracting the \`latitude\` value.

  \`\`\`
  ROW point = TO_GEOPOINT("POINT(42.97109629958868 14.7552534006536)")
  | EVAL x =  ST_X(point), y = ST_Y(point)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.starts_with',
        {
          defaultMessage: 'STARTS_WITH',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.starts_with.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### STARTS_WITH
  Returns a boolean that indicates whether a keyword string starts with another string.

  \`\`\`
  FROM employees
  | KEEP last_name
  | EVAL ln_S = STARTS_WITH(last_name, "B")
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.substring',
        {
          defaultMessage: 'SUBSTRING',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.substring.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### SUBSTRING
  Returns a substring of a string, specified by a start position and an optional length.

  \`\`\`
  FROM employees
  | KEEP last_name
  | EVAL ln_sub = SUBSTRING(last_name, 1, 3)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tan',
        {
          defaultMessage: 'TAN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tan.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TAN
  Returns the Tangent trigonometric function of an angle.

  \`\`\`
  ROW a=1.8 
  | EVAL tan=TAN(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tanh',
        {
          defaultMessage: 'TANH',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tanh.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TANH
  Returns the Tangent hyperbolic function of an angle.

  \`\`\`
  ROW a=1.8 
  | EVAL tanh=TANH(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tau',
        {
          defaultMessage: 'TAU',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tau.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TAU
  Returns the ratio of a circle's circumference to its radius.

  \`\`\`
  ROW TAU()
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_base64',
        {
          defaultMessage: 'TO_BASE64',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_base64.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_BASE64
  Encode a string to a base64 string.

  \`\`\`
  row a = "elastic" 
  | eval e = to_base64(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_boolean',
        {
          defaultMessage: 'TO_BOOLEAN',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_boolean.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_BOOLEAN
  Converts an input value to a boolean value.
  A string value of *true* will be case-insensitive converted to the Boolean *true*.
  For anything else, including the empty string, the function will return *false*.
  The numerical value of *0* will be converted to *false*, anything else will be converted to *true*.

  \`\`\`
  ROW str = ["true", "TRuE", "false", "", "yes", "1"]
  | EVAL bool = TO_BOOLEAN(str)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_cartesianpoint',
        {
          defaultMessage: 'TO_CARTESIANPOINT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_cartesianpoint.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_CARTESIANPOINT
  Converts an input value to a \`cartesian_point\` value.
  A string will only be successfully converted if it respects WKT Point format.

  \`\`\`
  ROW wkt = ["POINT(4297.11 -1475.53)", "POINT(7580.93 2272.77)"]
  | MV_EXPAND wkt
  | EVAL pt = TO_CARTESIANPOINT(wkt)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_cartesianshape',
        {
          defaultMessage: 'TO_CARTESIANSHAPE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_cartesianshape.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_CARTESIANSHAPE
  Converts an input value to a \`cartesian_shape\` value.
  A string will only be successfully converted if it respects WKT format.

  \`\`\`
  ROW wkt = ["POINT(4297.11 -1475.53)", "POLYGON ((3339584.72 1118889.97, 4452779.63 4865942.27, 2226389.81 4865942.27, 1113194.90 2273030.92, 3339584.72 1118889.97))"]
  | MV_EXPAND wkt
  | EVAL geom = TO_CARTESIANSHAPE(wkt)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_datetime',
        {
          defaultMessage: 'TO_DATETIME',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_datetime.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_DATETIME
  Converts an input value to a date value.
  A string will only be successfully converted if it's respecting the format \`yyyy-MM-dd'T'HH:mm:ss.SSS'Z'\`.
  To convert dates in other formats, use \`DATE_PARSE\`.

  \`\`\`
  ROW string = ["1953-09-02T00:00:00.000Z", "1964-06-02T00:00:00.000Z", "1964-06-02 00:00:00"]
  | EVAL datetime = TO_DATETIME(string)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_degrees',
        {
          defaultMessage: 'TO_DEGREES',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_degrees.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_DEGREES
  Converts a number in radians to degrees.

  \`\`\`
  ROW rad = [1.57, 3.14, 4.71]
  | EVAL deg = TO_DEGREES(rad)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_double',
        {
          defaultMessage: 'TO_DOUBLE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_double.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_DOUBLE
  Converts an input value to a double value. If the input parameter is of a date type,
  its value will be interpreted as milliseconds since the Unix epoch,
  converted to double. Boolean *true* will be converted to double *1.0*, *false* to *0.0*.

  \`\`\`
  ROW str1 = "5.20128E11", str2 = "foo"
  | EVAL dbl = TO_DOUBLE("520128000000"), dbl1 = TO_DOUBLE(str1), dbl2 = TO_DOUBLE(str2)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_geopoint',
        {
          defaultMessage: 'TO_GEOPOINT',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_geopoint.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_GEOPOINT
  Converts an input value to a \`geo_point\` value.
  A string will only be successfully converted if it respects WKT Point format.

  \`\`\`
  ROW wkt = "POINT(42.97109630194 14.7552534413725)"
  | EVAL pt = TO_GEOPOINT(wkt)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_geoshape',
        {
          defaultMessage: 'TO_GEOSHAPE',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_geoshape.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_GEOSHAPE
  Converts an input value to a \`geo_shape\` value.
  A string will only be successfully converted if it respects WKT format.

  \`\`\`
  ROW wkt = "POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))"
  | EVAL geom = TO_GEOSHAPE(wkt)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_integer',
        {
          defaultMessage: 'TO_INTEGER',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_integer.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_INTEGER
  Converts an input value to an integer value.
  If the input parameter is of a date type, its value will be interpreted as milliseconds
  since the Unix epoch, converted to integer.
  Boolean *true* will be converted to integer *1*, *false* to *0*.

  \`\`\`
  ROW long = [5013792, 2147483647, 501379200000]
  | EVAL int = TO_INTEGER(long)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_ip',
        {
          defaultMessage: 'TO_IP',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_ip.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_IP
  Converts an input string to an IP value.

  \`\`\`
  ROW str1 = "1.1.1.1", str2 = "foo"
  | EVAL ip1 = TO_IP(str1), ip2 = TO_IP(str2)
  | WHERE CIDR_MATCH(ip1, "1.0.0.0/8")
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_long',
        {
          defaultMessage: 'TO_LONG',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_long.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_LONG
  Converts an input value to a long value. If the input parameter is of a date type,
  its value will be interpreted as milliseconds since the Unix epoch, converted to long.
  Boolean *true* will be converted to long *1*, *false* to *0*.

  \`\`\`
  ROW str1 = "2147483648", str2 = "2147483648.2", str3 = "foo"
  | EVAL long1 = TO_LONG(str1), long2 = TO_LONG(str2), long3 = TO_LONG(str3)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_lower',
        {
          defaultMessage: 'TO_LOWER',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_lower.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_LOWER
  Returns a new string representing the input string converted to lower case.

  \`\`\`
  ROW message = "Some Text"
  | EVAL message_lower = TO_LOWER(message)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_radians',
        {
          defaultMessage: 'TO_RADIANS',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_radians.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_RADIANS
  Converts a number in degrees to radians.

  \`\`\`
  ROW deg = [90.0, 180.0, 270.0]
  | EVAL rad = TO_RADIANS(deg)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_string',
        {
          defaultMessage: 'TO_STRING',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_string.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_STRING
  Converts an input value into a string.

  \`\`\`
  ROW a=10
  | EVAL j = TO_STRING(a)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_unsigned_long',
        {
          defaultMessage: 'TO_UNSIGNED_LONG',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_unsigned_long.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_UNSIGNED_LONG
  Converts an input value to an unsigned long value. If the input parameter is of a date type,
  its value will be interpreted as milliseconds since the Unix epoch, converted to unsigned long.
  Boolean *true* will be converted to unsigned long *1*, *false* to *0*.

  \`\`\`
  ROW str1 = "2147483648", str2 = "2147483648.2", str3 = "foo"
  | EVAL long1 = TO_UNSIGNED_LONG(str1), long2 = TO_ULONG(str2), long3 = TO_UL(str3)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_upper',
        {
          defaultMessage: 'TO_UPPER',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_upper.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_UPPER
  Returns a new string representing the input string converted to upper case.

  \`\`\`
  ROW message = "Some Text"
  | EVAL message_upper = TO_UPPER(message)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_version',
        {
          defaultMessage: 'TO_VERSION',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.to_version.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TO_VERSION
  Converts an input string to a version value.

  \`\`\`
  ROW v = TO_VERSION("1.2.3")
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.top',
        {
          defaultMessage: 'TOP',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.top.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TOP
  Collects the top values for a field. Includes repeated values.

  \`\`\`
  FROM employees
  | STATS top_salaries = TOP(salary, 3, "desc"), top_salary = MAX(salary)
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
    // Do not edit manually... automatically generated by scripts/generate_esql_docs.ts
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.trim',
        {
          defaultMessage: 'TRIM',
        }
      ),
      description: (
        <Markdown
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.trim.markdown',
            {
              defaultMessage: `<!--
  This is generated by ESQL's AbstractFunctionTestCase. Do no edit it. See ../README.md for how to regenerate it.
  -->

  ### TRIM
  Removes leading and trailing whitespaces from a string.

  \`\`\`
  ROW message = "   some text  ",  color = " red "
  | EVAL message = TRIM(message)
  | EVAL color = TRIM(color)
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
