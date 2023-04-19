/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Markdown } from '@kbn/kibana-react-plugin/public';

export const initialSection = (
  <Markdown
    markdown={i18n.translate(
      'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.markdown',
      {
        defaultMessage: `## ESQL

An ESQL (Elasticsearch query language) query consists of a series of commands, separated by pipe characters: \`|\`. Each query starts with a **source command**, which produces a table, typically with data from Elasticsearch. 

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
  label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.sourceCommands', {
    defaultMessage: 'Source commands',
  }),
  description: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.commandsDescription', {
    defaultMessage: `A source command produces a table, typically with data from Elasticsearch. ESQL supports the following source commands.`,
  }),
  items: [
    {
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.from', {
        defaultMessage: 'FROM',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.from.markdown',
            {
              defaultMessage: `### FROM
The \`FROM\` source command returns a table with up to 10,000 documents from a data stream, index, or alias. Each row in the resulting table represents a document. Each column corresponds to a field, and can be accessed by the name of that field.
              
\`\`\`
FROM index
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.row', {
        defaultMessage: 'ROW',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.row.markdown',
            {
              defaultMessage: `### ROW
The \`ROW\` source command produces a row with one or more columns with values that you specify. This can be useful for testing.
              
\`\`\`
ROW a = 1, b = "two", c = null
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.show', {
        defaultMessage: 'SHOW',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.show.markdown',
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
  label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.processingCommands', {
    defaultMessage: 'Processing commands',
  }),
  description: i18n.translate(
    'unifiedSearch.query.textBasedLanguagesEditor.processingCommandsDescription',
    {
      defaultMessage: `Processing commands change an input table by adding, removing, or changing rows and columns. ESQL supports the following processing commands.`,
    }
  ),
  items: [
    {
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.dissect', {
        defaultMessage: 'DISSECT',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.dissect.markdown',
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.drop', {
        defaultMessage: 'DROP',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.drop.markdown',
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.eval', {
        defaultMessage: 'EVAL',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.eval.markdown',
            {
              defaultMessage: `### EVAL
\`EVAL\` enables you to add new columns to the end of a table:

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
| EVAL height_feet = height * 3.281, height_cm = height * 100
\`\`\`

If the specified column already exists, the existing column will be dropped, and the new column will be appended to the table:

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.grok', {
        defaultMessage: 'GROK',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.grok.markdown',
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.limit', {
        defaultMessage: 'LIMIT',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.limit.markdown',
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.project', {
        defaultMessage: 'PROJECT',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.project.markdown',
            {
              defaultMessage: `### PROJECT
The \`PROJECT\` command enables you to specify what columns are returned and the order in which they are returned.

To limit the columns that are returned, use a comma-separated list of column names. The columns are returned in the specified order:
              
\`\`\`
FROM employees
| PROJECT first_name, last_name, height
\`\`\`

Rather than specify each column by name, you can use wildcards to return all columns with a name that matches a pattern:

\`\`\`
FROM employees
| PROJECT h*
\`\`\`

The asterisk wildcard (\`*\`) by itself translates to all columns that do not match the other arguments. This query will first return all columns with a name that starts with an h, followed by all other columns:

\`\`\`
FROM employees
| PROJECT h*, *
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.rename', {
        defaultMessage: 'RENAME',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.rename.markdown',
            {
              defaultMessage: `### RENAME
Use \`RENAME\` to rename a column. If a column with the new name already exists, it will be replaced by the new column.
              
\`\`\`
FROM employees
| PROJECT first_name, last_name, still_hired
| RENAME employed = still_hired
\`\`\`

Multiple columns can be renamed with a single \`RENAME\` command:

\`\`\`
FROM employees
| PROJECT first_name, last_name
| RENAME fn = first_name, ln = last_name
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.sort', {
        defaultMessage: 'SORT',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.sort.markdown',
            {
              defaultMessage: `### SORT
Use the \`SORT\` command to sort rows on one or more fields:

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
| SORT height
\`\`\`

The default sort order is ascending. Set an explicit sort order using \`ASC\` or \`DESC\`:

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
| SORT height DESC
\`\`\`

If two rows have the same sort key, the original order will be preserved. You can provide additional sort expressions to act as tie breakers:

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
| SORT height DESC, first_name ASC
\`\`\`

#### \`null\` values
By default, \`null\` values are treated as being larger than any other value. With an ascending sort order, \`null\` values are sorted last, and with a descending sort order, \`null\` values are sorted first. You can change that by providing \`NULLS FIRST\` or \`NULLS LAST\`:

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.statsby', {
        defaultMessage: 'STATS ... BY',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.statsby.markdown',
            {
              defaultMessage: `### STATS ... BY
Use \`STATS ... BY\` to group rows according to a common value and calculate one or more aggregated values over the grouped rows.

\`\`\`
FROM employees
| STATS count = COUNT(languages) BY languages
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

The following aggregation functions are supported:

* \`AVG\`
* \`COUNT\`
* \`MAX\`
* \`MEDIAN\`
* \`MEDIAN_ABSOLUTE_DEVIATION\`
* \`MIN\`
* \`SUM\`
            `,
              description:
                'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
            }
          )}
        />
      ),
    },
    {
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.where', {
        defaultMessage: 'WHERE',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.where.markdown',
            {
              defaultMessage: `### WHERE
Use \`WHERE\` to produce a table that contains all the rows from the input table for which the provided condition evaluates to \`true\`:
              
\`\`\`
FROM employees
| PROJECT first_name, last_name, still_hired
| WHERE still_hired == true
\`\`\`

#### Operators
These comparison operators are supported:

* equality: \`==\`
* inequality: \`!=\`
* comparison:
  * less than: \`<\`
  * less than or equal: \`<=\`
  * larger than: \`>\`
  * larger than or equal: \`>=\`

You can use the following boolean operators:

* \`AND\`
* \`OR\`
* \`NOT\`

\`\`\`
FROM employees
| PROJECT first_name, last_name, height, still_hired
| WHERE height > 2 AND NOT still_hired
\`\`\`

#### Functions
\`WHERE\` supports various functions for calculating values. Refer to Functions for more information.
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
  label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.functions', {
    defaultMessage: 'Functions',
  }),
  description: i18n.translate(
    'unifiedSearch.query.textBasedLanguagesEditor.functionsDocumentationESQLDescription',
    {
      defaultMessage: `Functions are supported by ROW, EVAL and WHERE.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.absFunction',
        {
          defaultMessage: 'ABS',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.absFunction.markdown',
            {
              defaultMessage: `### ABS
Returns the absolute value.

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.concatFunction',
        {
          defaultMessage: 'CONCAT',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.concatFunction.markdown',
            {
              defaultMessage: `### CONCAT
Concatenates two or more strings.

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.dateFormatFunction',
        {
          defaultMessage: 'DATE_FORMAT',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.dateFormatFunction.markdown',
            {
              defaultMessage: `### DATE_FORMAT
Returns a string representation of a date in the provided format. If no format is specified, the \`yyyy-MM-dd'T'HH:mm:ss.SSSZ\` format is used.

\`\`\`
FROM employees
| PROJECT first_name, last_name, hire_date
| EVAL hired = DATE_FORMAT(hire_date, "YYYY-MM-dd")
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.dateTruncFunction',
        {
          defaultMessage: 'DATE_TRUNC',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.dateTruncFunction.markdown',
            {
              defaultMessage: `### DATE_TRUNC
Rounds down a date to the closest interval.

\`\`\`
FROM employees
| EVAL year_hired = DATE_TRUNC(hire_date, 1 year)
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
* \`1      day\`
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.isNullFunction',
        {
          defaultMessage: 'IS_NULL',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.isNullFunction.markdown',
            {
              defaultMessage: `### IS_NULL
Returns a boolean than indicates whether its input is \`null\`.

\`\`\`
FROM employees
| WHERE is_null(first_name)
\`\`\`

Combine this function with \`NOT\` to filter out any \`null\` data:

\`\`\`
FROM employees
| WHERE NOT is_null(first_name)
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.roundFunction',
        {
          defaultMessage: 'ROUND',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.roundFunction.markdown',
            {
              defaultMessage: `### ROUND
Rounds a number to the closest number with the specified number of digits. Defaults to 0 digits if no number of digits is provided. If the specified number of digits is negative, rounds to the number of digits left of the decimal point.

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.startsWithFunction',
        {
          defaultMessage: 'STARTS_WITH',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.startsWithFunction.markdown',
            {
              defaultMessage: `### STARTS_WITH
Returns a boolean that indicates whether a keyword string starts with another string:

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.substringFunction',
        {
          defaultMessage: 'SUBSTRING',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.substringFunction.markdown',
            {
              defaultMessage: `### SUBSTRING
Returns a substring of a string, specified by a start position and an optional length. This example returns the first three characters of every last name:

\`\`\`
FROM employees
| PROJECT last_name
| EVAL ln_sub = SUBSTRING(last_name, 1, 3)
\`\`\`

A negative start position is interpreted as being relative to the end of the string. This example returns the last three characters of of every last name:

\`\`\`
FROM employees
| PROJECT last_name
| EVAL ln_sub = SUBSTRING(last_name, -3, 3)
\`\`\`

If length is omitted, substring returns the remainder of the string. This example returns all characters except for the first:

\`\`\`
FROM employees
| PROJECT last_name
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
  ],
};
