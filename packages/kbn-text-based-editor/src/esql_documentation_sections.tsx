/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Markdown } from '@kbn/shared-ux-markdown';

export const initialSection = (
  <Markdown
    readOnly
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
          readOnly
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

The \`OPTIONS\` directive of the FROM command allows you to configure the way ES|QL accesses the data to be queried. The argument passed to this directive is a comma-separated list of option name-value pairs, with the option name and the corresponding value double-quoted.

For example:

\`\`\`
FROM index_pattern [OPTIONS "option1"="value1"[,...[,"optionN"="valueN"]]]
\`\`\`

Learn more about the \`OPTIONS\` directive in the [main documentation page](https://www.elastic.co/guide/en/elasticsearch/reference/master/esql-index-options.html#esql-index-options).
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
          readOnly
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
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.show.markdown',
            {
              defaultMessage: `### SHOW
The \`SHOW <item>\` source command returns information about the deployment and its capabilities:

* Use \`SHOW INFO\` to return the deployment's version, build date and hash.
* Use \`SHOW FUNCTIONS\` to return a list of all supported functions and a synopsis of each function.
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
          readOnly
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dissect.markdown',
            {
              defaultMessage: `### DISSECT
\`DISSECT\` enables you to extract structured data out of a string. \`DISSECT\` matches the string against a delimiter-based pattern, and extracts the specified keys as columns.

Refer to the [dissect processor documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/dissect-processor.html) for the syntax of dissect patterns.

\`\`\`
ROW a = "1953-01-23T12:15:00Z - some text - 127.0.0.1"
| DISSECT a "%\\{Y\\}-%\\{M\\}-%\\{D\\}T%\\{h\\}:%\\{m\\}:%\\{s\\}Z - %\\{msg\\} - %\\{ip\\}"
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.drop',
        {
          defaultMessage: 'DROP',
        }
      ),
      description: (
        <Markdown
          readOnly
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
          readOnly
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
          readOnly
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
          readOnly
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.grok.markdown',
            {
              defaultMessage: `### GROK
\`GROK\` enables you to extract structured data out of a string. \`GROK\` matches the string against patterns, based on regular expressions, and extracts the specified patterns as columns.

Refer to the [grok processor documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/grok-processor.html) for the syntax of grok patterns.

\`\`\`
ROW a = "12 15.5 15.6 true"
| GROK a "%\\{NUMBER:b:int\\} %\\{NUMBER:c:float\\} %\\{NUMBER:d:double\\} %\\{WORD:e:boolean\\}"
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
          readOnly
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
          readOnly
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
          readOnly
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
          readOnly
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
          readOnly
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
          readOnly
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
          readOnly
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
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.absFunction',
        {
          defaultMessage: 'ABS',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.absFunction.markdown',
            {
              defaultMessage: `### ABS
Returns the absolute value.

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| EVAL abs_height = ABS(0.0 - height)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.acosFunction',
        {
          defaultMessage: 'ACOS',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.acosFunction.markdown',
            {
              defaultMessage: `### ACOS
Inverse cosine trigonometric function.

\`\`\`
ROW a=.9
| EVAL acos=ACOS(a)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.asinFunction',
        {
          defaultMessage: 'ASIN',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.asinFunction.markdown',
            {
              defaultMessage: `### ASIN
Inverse sine trigonometric function.

\`\`\`
ROW a=.9
| EVAL asin=ASIN(a)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.atanFunction',
        {
          defaultMessage: 'ATAN',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.atanFunction.markdown',
            {
              defaultMessage: `### ATAN
Inverse tangent trigonometric function.

\`\`\`
ROW a=12.9
| EVAL atan=ATAN(a)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.atan2Function',
        {
          defaultMessage: 'ATAN2',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.atan2Function.markdown',
            {
              defaultMessage: `### ATAN2
The angle between the positive x-axis and the ray from the origin to the point (x , y) in the Cartesian plane.

\`\`\`
ROW y=12.9, x=.6
| EVAL atan2=ATAN2(y, x)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.autoBucketFunction',
        {
          defaultMessage: 'BUCKET',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.autoBucketFunction.markdown',
            {
              defaultMessage: `### BUCKET
Creates human-friendly buckets and returns a \`datetime\` value for each row that corresponds to the resulting bucket the row falls into. Combine \`BUCKET\`with \`STATS ... BY\` to create a date histogram.

You provide a target number of buckets, a start date, and an end date, and it picks an appropriate bucket size to generate the target number of buckets or fewer. For example, this asks for at most 20 buckets over a whole year, which picks monthly buckets:

\`\`\`
ROW date=TO_DATETIME("1985-07-09T00:00:00.000Z")
| EVAL bucket=BUCKET(date, 20, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")
\`\`\`

Returning:
\`\`\`
1985-07-09T00:00:00.000Z | 1985-07-01T00:00:00.000Z
\`\`\`

The goal isn't to provide *exactly* the target number of buckets, it's to pick a
range that people are comfortable with that provides at most the target number of
buckets.

If you ask for more buckets then \`BUCKET\` can pick a smaller range. For example,
asking for at most 100 buckets in a year will get you week long buckets:

\`\`\`
ROW date=TO_DATETIME("1985-07-09T00:00:00.000Z")
| EVAL bucket=BUCKET(date, 100, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")
\`\`\`

Returning:
\`\`\`
1985-07-09T00:00:00.000Z | 1985-07-08T00:00:00.000Z
\`\`\`

\`BUCKET\` does not filter any rows. It only uses the provided time range to pick a good bucket size. For rows with a date outside of the range, it returns a datetime that corresponds to a bucket outside the range. Combine \`BUCKET\` with \`WHERE\` to filter rows.

A more complete example might look like:

\`\`\`
FROM employees
| WHERE hire_date >= "1985-01-01T00:00:00Z" AND hire_date < "1986-01-01T00:00:00Z"
| EVAL bucket = BUCKET(hire_date, 20, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")
| STATS AVG(salary) BY bucket
| SORT bucket
\`\`\`

Returning:
\`\`\`
46305.0 | 1985-02-01T00:00:00.000Z
44817.0 | 1985-05-01T00:00:00.000Z
62405.0 | 1985-07-01T00:00:00.000Z
49095.0 | 1985-09-01T00:00:00.000Z
51532.0 | 1985-10-01T00:00:00.000Z
54539.75 | 1985-11-01T00:00:00.000
\`\`\`

NOTE: \`BUCKET\` does not create buckets that don’t match any documents. That’s why the example above is missing 1985-03-01 and other dates.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.caseFunction',
        {
          defaultMessage: 'CASE',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.caseFunction.markdown',
            {
              defaultMessage: `### CASE
Accepts pairs of conditions and values. The function returns the value that belongs to the first condition that evaluates to \`true\`. If the number of arguments is odd, the last argument is the default value which is returned when no condition matches.

\`\`\`
FROM employees
| EVAL type = CASE(
    languages <= 1, "monolingual",
    languages <= 2, "bilingual",
     "polyglot")
| KEEP first_name, last_name, type
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ceilFunction',
        {
          defaultMessage: 'CEIL',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ceilFunction.markdown',
            {
              defaultMessage: `### CEIL
Round a number up to the nearest integer.

\`\`\`
ROW a=1.8
| EVAL a=CEIL(a)
\`\`\`

Note: This is a noop for \`long\` (including unsigned) and \`integer\`. For \`double\` this picks the closest \`double\` value to the integer similar to Java's \`Math.ceil\`.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cidrMatchFunction',
        {
          defaultMessage: 'CIDR_MATCH',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cidrMatchFunction.markdown',
            {
              defaultMessage: `### CIDR_MATCH
Returns \`true\` if the provided IP is contained in one of the provided CIDR blocks. 

\`CIDR_MATCH\` accepts two or more arguments. The first argument is the IP address of type \`ip\` (both IPv4 and IPv6 are supported). Subsequent arguments are the CIDR blocks to test the IP against.

\`\`\`
FROM hosts
| WHERE CIDR_MATCH(ip, "127.0.0.2/32", "127.0.0.3/32")
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.coalesceFunction',
        {
          defaultMessage: 'COALESCE',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.coalesceFunction.markdown',
            {
              defaultMessage: `### COALESCE
Returns the first non-null value.

\`\`\`
ROW a=null, b="b"
| EVAL COALESCE(a, b)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.concatFunction',
        {
          defaultMessage: 'CONCAT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.concatFunction.markdown',
            {
              defaultMessage: `### CONCAT
Concatenates two or more strings.

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| EVAL fullname = CONCAT(first_name, " ", last_name)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cosFunction',
        {
          defaultMessage: 'COS',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cosFunction.markdown',
            {
              defaultMessage: `### COS
Cosine trigonometric function.

\`\`\`
ROW a=1.8
| EVAL cos=COS(a)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.coshFunction',
        {
          defaultMessage: 'COSH',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.coshFunction.markdown',
            {
              defaultMessage: `### COSH
Cosine hyperbolic function.

\`\`\`
ROW a=1.8
| EVAL cosh=COSH(a)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateDiffFunction',
        {
          defaultMessage: 'DATE_DIFF',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateDiffFunction.markdown',
            {
              defaultMessage: `### DATE_DIFF
Subtracts the \`startTimestamp\` from the \`endTimestamp\` and returns the difference in multiples of unit. If \`startTimestamp\` is later than the \`endTimestamp\`, negative values are returned.
  
\`\`\`
ROW date1 = TO_DATETIME("2023-12-02T11:00:00.000Z"), date2 = TO_DATETIME("2023-12-02T11:00:00.001Z")
| EVAL dd_ms = DATE_DIFF("microseconds", date1, date2)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateExtractFunction',
        {
          defaultMessage: 'DATE_EXTRACT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateExtractFunction.markdown',
            {
              defaultMessage: `### DATE_EXTRACT
Extracts parts of a date, like year, month, day, hour. The supported field types are those provided by Java's \`java.time.temporal.ChronoField\`.

\`\`\`
ROW date = DATE_PARSE("yyyy-MM-dd", "2022-05-06")
| EVAL year = DATE_EXTRACT("year", date)
\`\`\`

For example, to find all events that occurred outside of business hours (before 9 AM or after 5 PM), on any given date:

\`\`\`
FROM sample_data
| WHERE DATE_EXTRACT("hour_of_day", @timestamp) < 9 AND DATE_EXTRACT("hour_of_day", @timestamp) >= 17
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateFormatFunction',
        {
          defaultMessage: 'DATE_FORMAT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateFormatFunction.markdown',
            {
              defaultMessage: `### DATE_FORMAT
Returns a string representation of a date in the provided format. If no format is specified, the \`yyyy-MM-dd'T'HH:mm:ss.SSSZ\` format is used.

\`\`\`
FROM employees
| KEEP first_name, last_name, hire_date
| EVAL hired = DATE_FORMAT("YYYY-MM-dd", hire_date)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateParseFunction',
        {
          defaultMessage: 'DATE_PARSE',
        }
      ),
      description: (
        <Markdown
          readOnly
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateParseFunction.markdown',
            {
              defaultMessage: `### DATE_PARSE
Returns a date by parsing the second argument using the format specified in the first argument. If no format is specified, the \`yyyy-MM-dd'T'HH:mm:ss.SSSZ\` format is used.
Refer to [\`DateTimeFormatter\` documentation](https://docs.oracle.com/en/java/javase/14/docs/api/java.base/java/time/format/DateTimeFormatter.html) for syntax.
\`\`\`
ROW date_string = "2022-05-06"
| EVAL date = DATE_PARSE("yyyy-MM-dd", date_string)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateTruncFunction',
        {
          defaultMessage: 'DATE_TRUNC',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateTruncFunction.markdown',
            {
              defaultMessage: `### DATE_TRUNC
Rounds down a date to the closest interval.

\`\`\`
FROM employees
| EVAL year_hired = DATE_TRUNC(1 year, hire_date)
| STATS count(emp_no) BY year_hired
| SORT year_hired
\`\`\`

Intervals can be expressed using the timespan literal syntax. Timespan literals are a combination of a number and a qualifier. These qualifiers are supported:

* \`millisecond\`/milliseconds
* \`second\`/\`seconds\`
* \`minute\`/\`minutes\`
* \`hour\`/\`hours\`
* \`day\`/\`days\`
* \`week\`/\`weeks\`
* \`month\`/\`months\`
* \`year\`/\`years\`

Timespan literals are not whitespace sensitive. These expressions are all valid:

* \`1day\`
* \`1 day\`
* \`1      day\`

Combine \`DATE_TRUNC\` with \`STATS ... BY\` to create date histograms. For example, to return the number of hires per year:

\`\`\`
FROM employees
| EVAL year = DATE_TRUNC(1 year, hire_date)
| STATS hires = COUNT(emp_no) BY year
| SORT year
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.eFunction',
        {
          defaultMessage: 'E',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.eFunction.markdown',
            {
              defaultMessage: `### E
Euler’s number.

\`\`\`
ROW E()
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.endsWithFunction',
        {
          defaultMessage: 'ENDS_WITH',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.endsWithFunction.markdown',
            {
              defaultMessage: `### ENDS_WITH
Returns a boolean that indicates whether a keyword string ends with another string:

\`\`\`
FROM employees
| KEEP last_name
| EVAL ln_E = ENDS_WITH(last_name, "d")
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.floorFunction',
        {
          defaultMessage: 'FLOOR',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.floorFunction.markdown',
            {
              defaultMessage: `### FLOOR
Round a number down to the nearest integer.

\`\`\`
ROW a=1.8
| EVAL a=FLOOR(a)
\`\`\`

Note: this is a noop for \`long\` (including unsigned) and \`integer\`. For \`double\` this picks the closest \`double\` value to the integer similar to Java's \`Math.floor\`.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.greatestFunction',
        {
          defaultMessage: 'GREATEST',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.greatestFunction.markdown',
            {
              defaultMessage: `### GREATEST
Returns the maximum value from many columns. This is similar to \`MV_MAX\` except it's intended to run on multiple columns at once.

\`\`\`
ROW a = 10, b = 20
| EVAL g = GREATEST(a, b);
\`\`\`

Note: when run on \`keyword\` or \`text\` fields, this will return the last string in alphabetical order. When run on \`boolean\` columns this will return \`true\` if any values are \`true\`.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.leastFunction',
        {
          defaultMessage: 'LEAST',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.leastFunction.markdown',
            {
              defaultMessage: `### LEAST
Returns the minimum value from many columns. This is similar to \`MV_MIN\` except it's intended to run on multiple columns at once.

\`\`\`
ROW a = 10, b = 20
| EVAL l = LEAST(a, b)
\`\`\`

Note: when run on \`keyword\` or \`text\` fields, this will return the first string in alphabetical order. When run on \`boolean\` columns this will return \`false\` if any values are \`false\`.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.leftFunction',
        {
          defaultMessage: 'LEFT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.leftFunction.markdown',
            {
              defaultMessage: `### LEFT
Return the substring that extracts \`length\` chars from the \`string\`, starting from the left.

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
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.lengthFunction',
        {
          defaultMessage: 'LENGTH',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.lengthFunction.markdown',
            {
              defaultMessage: `### LENGTH
Returns the character length of a string.

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| EVAL fn_length = LENGTH(first_name)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.log10Function',
        {
          defaultMessage: 'LOG10',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.log10Function.markdown',
            {
              defaultMessage: `### LOG10
Returns the log base 10. The input can be any numeric value, the return value is always a double.

Logs of negative numbers are NaN. Logs of infinites are infinite, as is the log of 0.

\`\`\`
ROW d = 1000.0
| EVAL s = LOG10(d)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ltrimunction',
        {
          defaultMessage: 'LTRIM',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.ltrimFunction.markdown',
            {
              defaultMessage: `### LTRIM
Removes leading whitespaces from strings.

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
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvAvgFunction',
        {
          defaultMessage: 'MV_AVG',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvAvgFunction.markdown',
            {
              defaultMessage: `### MV_AVG
Converts a multivalued field into a single valued field containing the average of all of the values. For example:

\`\`\`
ROW a=[3, 5, 1, 6]
| EVAL avg_a = MV_AVG(a)
\`\`\`

Returning:

\`\`\`
[3, 5, 1, 6] | 3.75
\`\`\`

NOTE: The output type is always a double and the input type can be any number.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvConcatFunction',
        {
          defaultMessage: 'MV_CONCAT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvConcatFunction.markdown',
            {
              defaultMessage: `### MV_CONCAT
Converts a multivalued string field into a single valued field containing the concatenation of all values separated by a delimiter:

\`\`\`
ROW a=["foo", "zoo", "bar"]
| EVAL j = MV_CONCAT(a, ", ")
\`\`\`

Returning:

\`\`\`
["foo", "zoo", "bar"] | "foo, zoo, bar"
\`\`\`

If you want to join non-string fields call \`TO_STRING\` on them first:

\`\`\`
ROW a=[10, 9, 8]
| EVAL j = MV_CONCAT(TO_STRING(a), ", ")
\`\`\`

Returning:

\`\`\`
[10, 9, 8] | "10, 9, 8"
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvCountFunction',
        {
          defaultMessage: 'MV_COUNT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvCountFunction.markdown',
            {
              defaultMessage: `### MV_COUNT
Converts a multivalued field into a single valued field containing a count of the number of values:

\`\`\`
ROW a=["foo", "zoo", "bar"]
| EVAL count_a = MV_COUNT(a)
\`\`\`

Returning:

\`\`\`
["foo", "zoo", "bar"] | 3
\`\`\`

NOTE: This function accepts all types and always returns an integer.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvDedupeFunction',
        {
          defaultMessage: 'MV_DEDUPE',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvDedupeFunction.markdown',
            {
              defaultMessage: `### MV_DEDUPE
Removes duplicates from a multivalued field. For example:

\`\`\`
ROW a=["foo", "foo", "bar", "foo"]
| EVAL dedupe_a = MV_DEDUPE(a)
\`\`\`

Returning:

\`\`\`
["foo", "foo", "bar", "foo"] | ["foo", "bar"]
\`\`\`

NOTE: \`MV_DEDUPE\` may, but won’t always, sort the values in the field.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvFirstFunction',
        {
          defaultMessage: 'MV_FIRST',
        }
      ),
      description: (
        <Markdown
          readOnly
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvFirstFunction.markdown',
            {
              defaultMessage: `### MV_FIRST
Converts a multivalued field into a single valued field containing the first value. This is most useful when reading from a function that emits multivalued fields in a known order like \`SPLIT\`.

For example:

\`\`\`
ROW a="foo;bar;baz" 
| EVAL first_a = MV_FIRST(SPLIT(a, ";"))
\`\`\`

Returning:

\`\`\`
foo;bar;baz | foo
\`\`\`

The order that [multivalued fields](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql-multivalued-fields.html) are read from underlying storage is not guaranteed. It is frequently ascending, but don’t rely on that. If you need the minimum field value use \`MV_MIN\` instead of \`MV_FIRST\`. \`MV_MIN\` has optimizations for sorted values so there isn’t a performance benefit to \`MV_FIRST\`. \`MV_FIRST\` is mostly useful with functions that create multivalued fields like \`SPLIT\`.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvLastFunction',
        {
          defaultMessage: 'MV_LAST',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvLastFunction.markdown',
            {
              defaultMessage: `### MV_LAST
Converts a multivalued field into a single valued field containing the last value. This is most useful when reading from a function that emits multivalued fields in a known order like \`SPLIT\`:
  
\`\`\`
ROW a="foo;bar;baz" 
| EVAL first_a = MV_LAST(SPLIT(a, ";"))
\`\`\`

Returning:

\`\`\`
foo;bar;baz | baz
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvMaxFunction',
        {
          defaultMessage: 'MV_MAX',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvMaxFunction.markdown',
            {
              defaultMessage: `### MV_MAX
Converts a multivalued field into a single valued field containing the maximum value. For example:

\`\`\`
ROW a=[3, 5, 1]
| EVAL max_a = MV_MAX(a)
\`\`\`

Returning:

\`\`\`
[3, 5, 1] | 5
\`\`\`

It can be used by any field type, including \`keyword\` fields. In that case picks the last string, comparing their utf-8 representation byte by byte:

\`\`\`
ROW a=["foo", "zoo", "bar"]
| EVAL max_a = MV_MAX(a)
\`\`\`

Returning:

\`\`\`
["foo", "zoo", "bar"] | "zoo"
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvMedianFunction',
        {
          defaultMessage: 'MV_MEDIAN',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvMedianFunction.markdown',
            {
              defaultMessage: `### MV_MEDIAN
Converts a multivalued field into a single valued field containing the median value. For example:

\`\`\`
ROW a=[3, 5, 1]
| EVAL median_a = MV_MEDIAN(a)
\`\`\`

Returning:

\`\`\`
[3, 5, 1] | 3
\`\`\`

It can be used by any numeric field type and returns a value of the same type. If the row has an even number of values for a column the result will be the average of the middle two entries. If the field is not floating point then the average rounds **down**:

\`\`\`
ROW a=[3, 7, 1, 6]
| EVAL median_a = MV_MEDIAN(a)
\`\`\`

Returning:

\`\`\`
[3, 7, 1, 6] | 4
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvMinFunction',
        {
          defaultMessage: 'MV_MIN',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvMinFunction.markdown',
            {
              defaultMessage: `### MV_MIN
Converts a multivalued field into a single valued field containing the minimum value. For example:

\`\`\`
ROW a=[2, 1]
| EVAL min_a = MV_MIN(a)
\`\`\`

Returning:

\`\`\`
[2, 1] | 1
\`\`\`

It can be used by any field type, including \`keyword\` fields. In that case picks the last string, comparing their utf-8 representation byte by byte:

\`\`\`
ROW a=["foo", "bar"]
| EVAL min_a = MV_MIN(a)
\`\`\`

Returning:

\`\`\`
["foo", "bar"] | "bar"
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvSortFunction',
        {
          defaultMessage: 'MV_SORT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvSortFunction.markdown',
            {
              defaultMessage: `### MV_SORT
Sorts a multivalue expression in lexicographical order.

Example:

\`\`\`
ROW a = [4, 2, -3, 2]
| EVAL sa = mv_sort(a), sd = mv_sort(a, "DESC")
\`\`\`


Valid order options are \`ASC\` and \`DESC\`, default is \`ASC\`.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvSliceFunction',
        {
          defaultMessage: 'MV_SLICE',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvSliceFunction.markdown',
            {
              defaultMessage: `### MV_SLICE
Returns a subset of the multivalued field using the start and end index values.


Example:

\`\`\`
ROW a = [1, 2, 2, 3]
| EVAL a1 = MV_SLICE(a, 1), a2 = MV_SLICE(a, 2, 3)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvSumFunction',
        {
          defaultMessage: 'MV_SUM',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvSumFunction.markdown',
            {
              defaultMessage: `### MV_SUM
Converts a multivalued field into a single valued field containing the sum of all of the values. For example:
\`\`\`
ROW a=[3, 5, 6]
| EVAL sum_a = MV_SUM(a)
\`\`\`

Returning:

\`\`\`
[3, 5, 6] | 14
\`\`\`

NOTE: The input type can be any number and the output type is the same as the input type.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvZipFunction',
        {
          defaultMessage: 'MV_ZIP',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.mvZipFunction.markdown',
            {
              defaultMessage: `### MV_ZIP
Combines the values from two multivalued fields with a delimiter that joins them together.


Example:

\`\`\`
ROW a = ["x", "y", "z"], b = ["1", "2"]
| EVAL c = mv_zip(a, b, "-")
| KEEP a, b, c
\`\`\`

Specifying a delimiter is optional. If omitted, the default delimiter \`,\` is used.


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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.nowFunction',
        {
          defaultMessage: 'NOW',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.nowFunction.markdown',
            {
              defaultMessage: `### NOW
Returns current date and time.

\`\`\`
ROW current_date = NOW()
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.piFunction',
        {
          defaultMessage: 'PI',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.piFunction.markdown',
            {
              defaultMessage: `### PI
The ratio of a circle's circumference to its diameter.

\`\`\`
ROW PI()
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.powFunction',
        {
          defaultMessage: 'POW',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.powFunction.markdown',
            {
              defaultMessage: `### POW
Returns the value of a base (first argument) raised to the power of an exponent (second argument). Both arguments must be numeric. The output is always a double. Note that it is still possible to overflow a double result here; in that case, \`null\` will be returned.

\`\`\`
ROW base = 2.0, exponent = 2.0 
| EVAL s = POW(base, exponent)
\`\`\`

#### Fractional exponents

The exponent can be a fraction, which is similar to performing a root. For example, the exponent of 0.5 will give the square root of the base:

\`\`\`
ROW base = 4, exponent = 0.5
| EVAL s = POW(base, exponent)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.rightFunction',
        {
          defaultMessage: 'RIGHT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.rightFunction.markdown',
            {
              defaultMessage: `### RIGHT
Return the substring that extracts \`length\` chars from the string starting from the \`right\`.

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
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.roundFunction',
        {
          defaultMessage: 'ROUND',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.roundFunction.markdown',
            {
              defaultMessage: `### ROUND
Rounds a number to the closest number with the specified number of digits. Defaults to 0 digits if no number of digits is provided. If the specified number of digits is negative, rounds to the number of digits left of the decimal point.

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| EVAL height = ROUND(height * 3.281, 1)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.rtrimFunction',
        {
          defaultMessage: 'RTRIM',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.rtrimFunction.markdown',
            {
              defaultMessage: `### RTRIM
Removes trailing whitespaces from strings.

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
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.signumFunction',
        {
          defaultMessage: 'SIGNUM',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.signumFunction.markdown',
            {
              defaultMessage: `### SIGNUM
Returns the sign of the given number. Returns \`-1\` for negative numbers, \`0\` for \`0\` and \`1\` for positive numbers.

Example:

\`\`\`
ROW d = 100.0
| EVAL s = SIGNUM(d)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sinFunction',
        {
          defaultMessage: 'SIN',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sinFunction.markdown',
            {
              defaultMessage: `### SIN
Sine trigonometric function.

\`\`\`
ROW a=1.8
| EVAL sin=SIN(a)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sinhFunction',
        {
          defaultMessage: 'SINH',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sinhFunction.markdown',
            {
              defaultMessage: `### SINH
Sine hyperbolic function.

\`\`\`
ROW a=1.8
| EVAL sinh=SINH(a)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.splitFunction',
        {
          defaultMessage: 'SPLIT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.splitFunction.markdown',
            {
              defaultMessage: `### SPLIT
Splits a single valued string into multiple strings. For example:

\`\`\`
ROW words="foo;bar;baz;qux;quux;corge"
| EVAL word = SPLIT(words, ";")
\`\`\`

Which splits \`"foo;bar;baz;qux;quux;corge"\` on \`;\` and returns an array:

\`\`\`
foo;bar;baz;qux;quux;corge | [foo,bar,baz,qux,quux,corge]
\`\`\`

NOTE: Only single byte delimiters are currently supported.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sqrtFunction',
        {
          defaultMessage: 'SQRT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.sqrtFunction.markdown',
            {
              defaultMessage: `### SQRT
Returns the square root of a number. The input can be any numeric value, the return value is always a double.

Square roots of negative numbers are NaN. Square roots of infinites are infinite.

\`\`\`
ROW d = 100.0
| EVAL s = SQRT(d)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.startsWithFunction',
        {
          defaultMessage: 'STARTS_WITH',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.startsWithFunction.markdown',
            {
              defaultMessage: `### STARTS_WITH
Returns a boolean that indicates whether a keyword string starts with another string:

\`\`\`
FROM employees
| KEEP first_name, last_name, height
| EVAL ln_S = STARTS_WITH(last_name, "S")
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.substringFunction',
        {
          defaultMessage: 'SUBSTRING',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.substringFunction.markdown',
            {
              defaultMessage: `### SUBSTRING
Returns a substring of a string, specified by a start position and an optional length. This example returns the first three characters of every last name:

\`\`\`
FROM employees
| KEEP last_name
| EVAL ln_sub = SUBSTRING(last_name, 1, 3)
\`\`\`

A negative start position is interpreted as being relative to the end of the string. This example returns the last three characters of of every last name:

\`\`\`
FROM employees
| KEEP last_name
| EVAL ln_sub = SUBSTRING(last_name, -3, 3)
\`\`\`

If length is omitted, substring returns the remainder of the string. This example returns all characters except for the first:

\`\`\`
FROM employees
| KEEP last_name
| EVAL ln_sub = SUBSTRING(last_name, 2)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tanFunction',
        {
          defaultMessage: 'TAN',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tanFunction.markdown',
            {
              defaultMessage: `### TAN
Tangent trigonometric function.

\`\`\`
ROW a=1.8
| EVAL tan=TAN(a)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tanhFunction',
        {
          defaultMessage: 'TANH',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tanhFunction.markdown',
            {
              defaultMessage: `### TANH
Tangent hyperbolic function.

\`\`\`
ROW a=1.8
| EVAL tanh=TANH(a)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tauFunction',
        {
          defaultMessage: 'TAU',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.tauFunction.markdown',
            {
              defaultMessage: `### TAU
The ratio of a circle's circumference to its radius.

\`\`\`
ROW TAU()
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toBooleanFunction',
        {
          defaultMessage: 'TO_BOOLEAN',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toBooleanFunction.markdown',
            {
              defaultMessage: `### TO_BOOLEAN
Converts an input value to a boolean value.

The input can be a single- or multi-valued field or an expression. The input type must be of a string or numeric type.

A string value of **"true"** will be case-insensitive converted to the Boolean **true**. For anything else, including the empty string, the function will return **false**. For example:

\`\`\`
ROW str = ["true", "TRuE", "false", "", "yes", "1"]
| EVAL bool = TO_BOOLEAN(str)
\`\`\`

Returning:

\`\`\`
["true", "TRuE", "false", "", "yes", "1"] | [true, true, false, false, false, false]
\`\`\`

The numerical value of **0** will be converted to **false**, anything else will be converted to **true**.

Alias: TO_BOOL
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toCartesianpointFunction',
        {
          defaultMessage: 'TO_CARTESIANPOINT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toCartesianpointFunction.markdown',
            {
              defaultMessage: `### TO_CARTESIANPOINT
Converts an input value to a \`point\` value.

The input can be a single- or multi-valued field or an expression. The input type must be a string or a cartesian point.

A string will only be successfully converted if it respects the [WKT Point](https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry) format:

\`\`\`
ROW wkt = ["POINT(4297.11 -1475.53)", "POINT(7580.93 2272.77)"]
| MV_EXPAND wkt
| EVAL pt = TO_CARTESIANPOINT(wkt)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toCartesianShapeFunction',
        {
          defaultMessage: 'TO_CARTESIANSHAPE',
        }
      ),
      description: (
        <Markdown
          readOnly
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toCartesianShapeFunction.markdown',
            {
              defaultMessage: `### TO_CARTESIANSHAPE
Converts an input value to a \`cartesian_shape\` value.

The input can be a single- or multi-valued field or an expression. The input type must be a string or a \`cartesian_shape\`.
              
A string will only be successfully converted if it respects the [WKT](https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry) format:
    
For example:
    
\`\`\`
ROW wkt = ["POINT(4297.11 -1475.53)", "POLYGON ((3339584.72 1118889.97, 4452779.63 4865942.27, 2226389.81 4865942.27, 1113194.90 2273030.92, 3339584.72 1118889.97))"]
| MV_EXPAND wkt
| EVAL geom = TO_CARTESIANSHAPE(wkt)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toDatetimeFunction',
        {
          defaultMessage: 'TO_DATETIME',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toDatetimeFunction.markdown',
            {
              defaultMessage: `### TO_DATETIME
Converts an input value to a date value.

The input can be a single- or multi-valued field or an expression. The input type must be of a string or numeric type.

A string will only be successfully converted if it’s respecting the format \`yyyy-MM-dd'T'HH:mm:ss.SSS'Z'\`. For example:

\`\`\`
ROW string = ["1953-09-02T00:00:00.000Z", "1964-06-02T00:00:00.000Z", "1964-06-02 00:00:00"]
| EVAL datetime = TO_DATETIME(string)
\`\`\`

Returning:

\`\`\`
["1953-09-02T00:00:00.000Z", "1964-06-02T00:00:00.000Z", "1964-06-02 00:00:00"] | [1953-09-02T00:00:00.000Z, 1964-06-02T00:00:00.000Z]
\`\`\`

Note that in this example, the last value in the source multi-valued field has not been converted. The reason being that if the date format is not respected, the conversion will result in a **null** value.

If the input parameter is of a numeric type, its value will be interpreted as milliseconds since the Unix epoch. For example:

\`\`\`
ROW int = [0, 1]
| EVAL dt = TO_DATETIME(int)
\`\`\`

Returning:

\`\`\`
[0, 1] | [1970-01-01T00:00:00.000Z, 1970-01-01T00:00:00.001Z]
\`\`\`

Alias: TO_DT
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toDegreesFunction',
        {
          defaultMessage: 'TO_DEGREES',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toDegreesFunction.markdown',
            {
              defaultMessage: `### TO_DEGREES
Converts a number in radians to degrees.

The input can be a single- or multi-valued field or an expression. The input type must be of a numeric type and result is always \`double\`.

\`\`\`
ROW rad = [1.57, 3.14, 4.71]
| EVAL deg = TO_DEGREES(rad)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toDoubleFunction',
        {
          defaultMessage: 'TO_DOUBLE',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toDoubleFunction.markdown',
            {
              defaultMessage: `### TO_DOUBLE
Converts an input value to a double value.

The input can be a single- or multi-valued field or an expression. The input type must be of a boolean, date, string or numeric type.

Example:

\`\`\`
ROW str1 = "5.20128E11", str2 = "foo"
| EVAL dbl = TO_DOUBLE("520128000000"), dbl1 = TO_DOUBLE(str1), dbl2 = TO_DOUBLE(str2)
\`\`\`

Returning:

\`\`\`
5.20128E11 | foo | 5.20128E11 | 5.20128E11 | null
\`\`\`

Note that in this example, the last conversion of the string isn’t possible. When this happens, the result is a **null** value.

If the input parameter is of a date type, its value will be interpreted as milliseconds since the Unix epoch, converted to double.

Boolean **true** will be converted to double **1.0**, **false** to **0.0**.

Alias: TO_DBL
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toGeopointFunction',
        {
          defaultMessage: 'TO_GEOPOINT',
        }
      ),
      description: (
        <Markdown
          readOnly
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toGeopointFunction.markdown',
            {
              defaultMessage: `### TO_GEOPOINT
Converts an input value to a \`geo_point\` value.

The input can be a single- or multi-valued field or an expression. The input type must be a string or a \`geo_point\`.

A string will only be successfully converted if it respects the [WKT Point](https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry) format:

\`\`\`
ROW wkt = "POINT(42.97109630194 14.7552534413725)"
| EVAL pt = TO_GEOPOINT(wkt)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toGeoshapeFunction',
        {
          defaultMessage: 'TO_GEOSHAPE',
        }
      ),
      description: (
        <Markdown
          readOnly
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toGeoshapeFunction.markdown',
            {
              defaultMessage: `### TO_GEOSHAPE
Converts an input value to a \`geo_shape\` value.

The input can be a single- or multi-valued field or an expression. The input type must be a string or a \`geo_shape\`.

A string will only be successfully converted if it respects the [WKT format](https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry).

For example:

\`\`\`
ROW wkt = "POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))"
| EVAL geom = TO_GEOSHAPE(wkt)
\`\`\`

Returning:

\`\`\`
POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10)) | POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toIntegerFunction',
        {
          defaultMessage: 'TO_INTEGER',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toIntegerFunction.markdown',
            {
              defaultMessage: `### TO_INTEGER
Converts an input value to an integer value.

The input can be a single- or multi-valued field or an expression. The input type must be of a boolean, date, string or numeric type.

Example:

\`\`\`
ROW long = [5013792, 2147483647, 501379200000]
| EVAL int = TO_INTEGER(long)
\`\`\`

Returning:

\`\`\`
[5013792, 2147483647, 501379200000] | [5013792, 2147483647]
\`\`\`

Note that in this example, the last value of the multi-valued field cannot be converted as an integer. When this happens, the result is a **null** value.

If the input parameter is of a date type, its value will be interpreted as milliseconds since the Unix epoch, converted to integer.

Boolean **true** will be converted to integer **1**, **false** to **0**.

Alias: TO_INT
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toIpFunction',
        {
          defaultMessage: 'TO_IP',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toIpFunction.markdown',
            {
              defaultMessage: `### TO_IP
Converts an input string to an IP value.

The input can be a single- or multi-valued field or an expression.

Example:

\`\`\`
ROW str1 = "1.1.1.1", str2 = "foo"
| EVAL ip1 = TO_IP(str1), ip2 = TO_IP(str2)
| WHERE CIDR_MATCH(ip1, "1.0.0.0/8")
\`\`\`

Returning:

\`\`\`
1.1.1.1 | foo | 1.1.1.1 | null
\`\`\`

Note that in the example above the last conversion of the string isn’t possible. When this happens, the result is a **null** value.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toLongFunction',
        {
          defaultMessage: 'TO_LONG',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toLongFunction.markdown',
            {
              defaultMessage: `### TO_LONG
Converts an input value to an long value.

The input can be a single- or multi-valued field or an expression. The input type must be of a boolean, date, string or numeric type.

Example:

\`\`\`
ROW str1 = "2147483648", str2 = "2147483648.2", str3 = "foo"
| EVAL long1 = TO_LONG(str1), long2 = TO_LONG(str2), long3 = TO_LONG(str3)
\`\`\`

Returning:

\`\`\`
2147483648 | 2147483648.2 | foo | 2147483648 | 2147483648 | null
\`\`\`

Note that in this example, the last conversion of the string isn't possible. When this happens, the result is a **null** value. 

If the input parameter is of a date type, its value will be interpreted as milliseconds since the Unix epoch, converted to integer.

Boolean \`true\` will be converted to long \`1\`, \`false\` to \`0\`.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toLowerFunction',
        {
          defaultMessage: 'TO_LOWER',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toLowerFunction.markdown',
            {
              defaultMessage: `### TO_LOWER
Returns a new string representing the input string converted to lower case.
For example:
    
\`\`\`
ROW message = "Some Text" 
| EVAL message_lower = TO_LOWER(message)
\`\`\`

Returning:

\`\`\`
Some Text | some text
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toRadiansFunction',
        {
          defaultMessage: 'TO_RADIANS',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toRadiansFunction.markdown',
            {
              defaultMessage: `### TO_RADIANS
Converts a number in degrees to radians.

The input can be a single- or multi-valued field or an expression. The input type must be of a numeric type and result is always \`double\`.

\`\`\`
ROW deg = [90.0, 180.0, 270.0]
| EVAL rad = TO_RADIANS(deg)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toStringFunction',
        {
          defaultMessage: 'TO_STRING',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toStringFunction.markdown',
            {
              defaultMessage: `### TO_STRING
Converts a field into a string. For example:

\`\`\`
ROW a=10
| EVAL j = TO_STRING(a)
\`\`\`

It also works fine on multivalued fields:

\`\`\`
ROW a=[10, 9, 8]
| EVAL j = TO_STRING(a)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toUnsignedLongFunction',
        {
          defaultMessage: 'TO_UNSIGNED_LONG',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toUnsignedLongFunction.markdown',
            {
              defaultMessage: `### TO_UNSIGNED_LONG
Converts an input value to an unsigned long value.

The input can be a single- or multi-valued field or an expression. The input type must be of a boolean, date, string or numeric type.

\`\`\`
ROW str1 = "2147483648", str2 = "2147483648.2", str3 = "foo"
| EVAL long1 = TO_UNSIGNED_LONG(str1), long2 = TO_ULONG(str2), long3 = TO_UL(str3)
\`\`\`

Note that in this example, the last conversion of the string isn't possible. When this happens, the result is a **null** value. In this case a Warning header is added to the response. The header will provide information on the source of the failure:

\`\`\`
"Line 1:133: evaluation of [TO_UL(str3)] failed, treating result as null. Only first 20 failures recorded."
\`\`\`

A following header will contain the failure reason and the offending value:

\`\`\`
"java.lang.NumberFormatException: Character f is neither a decimal digit number, decimal point, nor \"e\" notation exponential mark."
\`\`\`

If the input parameter is of a date type, its value will be interpreted as milliseconds since the Unix epoch, converted to unsigned long.

Boolean \`true\` will be converted to unsigned long \`1\`, \`false\` to \`0\`.

Alias: TO_ULONG, TO_UL
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toUpperFunction',
        {
          defaultMessage: 'TO_UPPER',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toUpperFunction.markdown',
            {
              defaultMessage: `### TO_UPPER
Returns a new string representing the input string converted to upper case.

For example:

\`\`\`
ROW message = "Some Text" 
| EVAL message_upper = TO_UPPER(message)
\`\`\`

Returning:

\`\`\`
Some Text | SOME TEXT
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toVersionFunction',
        {
          defaultMessage: 'TO_VERSION',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.toVersionFunction.markdown',
            {
              defaultMessage: `### TO_VERSION
Converts an input string to a version value. For example:

\`\`\`
ROW v = TO_VERSION("1.2.3")
\`\`\`

Returning:

\`\`\`
1.2.3
\`\`\`

Alias: TO_VER
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.trimFunction',
        {
          defaultMessage: 'TRIM',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.trimFunction.markdown',
            {
              defaultMessage: `### TRIM
Removes leading and trailing whitespaces from strings.

\`\`\`
ROW message = "   some text  ",  color = " red "
| EVAL message = TRIM(message)
| EVAL color = TRIM(color)
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
          readOnly
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
          readOnly
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
          readOnly
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
          readOnly
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
          readOnly
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
          readOnly
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
          readOnly
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
          readOnly
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
          defaultMessage: 'ST_CENTROID',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stCentroidFunction.markdown',
            {
              defaultMessage: `### ST_CENTROID
Calculates the spatial centroid over a field with spatial point geometry type.

\`\`\`
FROM airports
| STATS centroid=ST_CENTROID(location)
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
          readOnly
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
          readOnly
          openLinksInNewTab={true}
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.valuesFunction.markdown',
            {
              defaultMessage: `### VALUES

_**WARNING: Do not use \`VALUES\` on production environments. This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.**


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

export const spatialFunctions = {
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.spatialFunctions', {
    defaultMessage: 'Spatial functions',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.spatialFunctionsDocumentationESQLDescription',
    {
      defaultMessage: `ES|QL supports these spatial functions:`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stcontainsFunction',
        {
          defaultMessage: 'ST_CONTAINS',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stcontainsFunction.markdown',
            {
              defaultMessage: `### ST_CONTAINS

**WARNING: This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.**

Returns whether the first geometry contains the second geometry.
This is the inverse of the \`ST_WITHIN\` function.

Example:

\`\`\`
FROM airport_city_boundaries
| WHERE ST_CONTAINS(city_boundary, TO_GEOSHAPE("POLYGON((109.35 18.3, 109.45 18.3, 109.45 18.4, 109.35 18.4, 109.35 18.3))"))
| KEEP abbrev, airport, region, city, city_location
\`\`\`
            `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    // ST_DISJOINT
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stdisjointFunction',
        {
          defaultMessage: 'ST_DISJOINT',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stdisjointFunction.markdown',
            {
              defaultMessage: `### ST_DISJOINT
**WARNING: This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.**

Returns whether the two geometries or geometry columns are disjoint.

This is the inverse of the \`ST_INTERSECTS\` function.

Example:

\`\`\`
FROM airport_city_boundaries
| WHERE ST_DISJOINT(city_boundary, TO_GEOSHAPE("POLYGON((-10 -60, 120 -60, 120 60, -10 60, -10 -60))"))
| KEEP abbrev, airport, region, city, city_location
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stintersectsFunction',
        {
          defaultMessage: 'ST_INTERSECTS',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stintersectsFunction.markdown',
            {
              defaultMessage: `### ST_INTERSECTS


**WARNING: This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.**

Returns true if two geometries intersect. They intersect if they have any point in common, including their interior points (points along lines or within polygons). This is the inverse of the \`ST_DISJOINT\` function. 

Example:

\`\`\`
FROM airports
| WHERE ST_INTERSECTS(location, TO_GEOSHAPE("POLYGON((42 14, 43 14, 43 15, 42 15, 42 14))"))
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stwithinFunction',
        {
          defaultMessage: 'ST_WITHIN',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stwithinFunction.markdown',
            {
              defaultMessage: `### ST_WITHIN
**WARNING: This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.**

Returns whether the first geometry is within the second geometry.
This is the inverse of the \`ST_CONTAINS\` function.

Example:

\`\`\`
FROM airport_city_boundaries
| WHERE ST_WITHIN(city_boundary, TO_GEOSHAPE("POLYGON((109.1 18.15, 109.6 18.15, 109.6 18.65, 109.1 18.65, 109.1 18.15))"))
| KEEP abbrev, airport, region, city, city_location
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stxFunction',
        {
          defaultMessage: 'ST_X',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.stxFunction.markdown',
            {
              defaultMessage: `### ST_X
**WARNING: This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.**


Extracts the \`x\` coordinate from the supplied point. If the point is of type \`geo_point\` this is equivalent to extracting the \`longitude\` value.

Example:

\`\`\`
ROW point = TO_GEOPOINT("POINT(42.97109629958868 14.7552534006536)")
| EVAL x =  ST_X(point), y = ST_Y(point)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.styFunction',
        {
          defaultMessage: 'ST_Y',
        }
      ),
      description: (
        <Markdown
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.styFunction.markdown',
            {
              defaultMessage: `### ST_Y
**WARNING: This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.**

Extracts the \`y\` coordinate from the supplied point. If the point is of type \`geo_point\` this is equivalent to extracting the \`latitude\` value.

Example:

\`\`\`
ROW point = TO_GEOPOINT("POINT(42.97109629958868 14.7552534006536)")
| EVAL x =  ST_X(point), y = ST_Y(point)
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
          readOnly
          markdownContent={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.binaryOperators.markdown',
            {
              defaultMessage: `### Binary operators
These binary comparison operators are supported:

* equality: \`==\`
* case insensitive equality \`=~\`
* inequality: \`!=\`
* less than: \`<\`
* less than or equal: \`<=\`
* larger than: \`>\`
* larger than or equal: \`>=\`
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
          readOnly
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.inOperator',
        {
          defaultMessage: 'IN',
        }
      ),
      description: (
        <Markdown
          readOnly
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
          readOnly
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
          readOnly
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
