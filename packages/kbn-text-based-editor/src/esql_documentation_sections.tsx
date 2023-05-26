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
      'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.markdown',
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
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.sourceCommands', {
    defaultMessage: 'Source commands',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.commandsDescription',
    {
      defaultMessage: `A source command produces a table, typically with data from Elasticsearch. ESQL supports the following source commands.`,
    }
  ),
  items: [
    {
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentation.from', {
        defaultMessage: 'FROM',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.from.markdown',
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
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentation.row', {
        defaultMessage: 'ROW',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.row.markdown',
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
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentation.show', {
        defaultMessage: 'SHOW',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.show.markdown',
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
      defaultMessage: `Processing commands change an input table by adding, removing, or changing rows and columns. ESQL supports the following processing commands.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.dissect',
        {
          defaultMessage: 'DISSECT',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.dissect.markdown',
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
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentation.drop', {
        defaultMessage: 'DROP',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.drop.markdown',
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
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentation.eval', {
        defaultMessage: 'EVAL',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.eval.markdown',
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
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentation.grok', {
        defaultMessage: 'GROK',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.grok.markdown',
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
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentation.limit', {
        defaultMessage: 'LIMIT',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.limit.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.project',
        {
          defaultMessage: 'PROJECT',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.project.markdown',
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
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentation.rename', {
        defaultMessage: 'RENAME',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.rename.markdown',
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
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentation.sort', {
        defaultMessage: 'SORT',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.sort.markdown',
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
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.statsby',
        {
          defaultMessage: 'STATS ... BY',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.statsby.markdown',
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
* \`COUNT_DISTINCT\`
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
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.documentation.where', {
        defaultMessage: 'WHERE',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.where.markdown',
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

For string comparison using wildcards or regular expressions, use \`LIKE\` or \`RLIKE\`:

* Use \`LIKE\` to match strings using wildcards. The following wildcard characters are supported:
  * \`*\` matches zero or more characters. 
  * \`?\` matches one character. 

  \`\`\`
  FROM employees 
  | WHERE first_name LIKE "?b*" 
  | PROJECT first_name, last_name
  \`\`\`

* Use \`RLIKE\` to match strings using [regular expressions](https://www.elastic.co/guide/en/elasticsearch/reference/current/regexp-syntax.html):

  \`\`\`
  FROM employees 
  | WHERE first_name RLIKE ".leja.*" 
  | PROJECT first_name, last_name
  \`\`\`

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
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.absFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.caseFunction',
        {
          defaultMessage: 'CASE',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
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
| PROJECT first_name, last_name, type
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.cidrMatchFunction',
        {
          defaultMessage: 'CIDR_MATCH',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.concatFunction',
        {
          defaultMessage: 'CONCAT',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.concatFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateFormatFunction',
        {
          defaultMessage: 'DATE_FORMAT',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateFormatFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateTruncFunction',
        {
          defaultMessage: 'DATE_TRUNC',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.dateTruncFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.isFiniteFunction',
        {
          defaultMessage: 'IS_FINITE',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.isFiniteFunction.markdown',
            {
              defaultMessage: `### IS_FINITE
Returns a boolean that indicates whether its input is a finite number.

\`\`\`
ROW d = 1.0 
| EVAL s = IS_FINITE(d/0)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.isInfiniteFunction',
        {
          defaultMessage: 'IS_INFINITE',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.isInfiniteFunction.markdown',
            {
              defaultMessage: `### IS_INFINITE
Returns a boolean that indicates whether its input is infinite.

\`\`\`
ROW d = 1.0 
| EVAL s = IS_INFINITE(d/0)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.isNanFunction',
        {
          defaultMessage: 'IS_NAN',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.isNanFunction.markdown',
            {
              defaultMessage: `### IS_NAN
Returns a boolean that indicates whether its input is not a number.

\`\`\`
ROW d = 1.0 
| EVAL s = IS_NAN(d)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.isNullFunction',
        {
          defaultMessage: 'IS_NULL',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.isNullFunction.markdown',
            {
              defaultMessage: `### IS_NULL
Returns a boolean than indicates whether its input is \`null\`.

\`\`\`
FROM employees
| WHERE IS_NULL(first_name)
\`\`\`

Combine this function with \`NOT\` to filter out any \`null\` data:

\`\`\`
FROM employees
| WHERE NOT IS_NULL(first_name)
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.lengthFunction',
        {
          defaultMessage: 'LENGTH',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.lengthFunction.markdown',
            {
              defaultMessage: `### LENGTH
Returns the character length of a string.

\`\`\`
FROM employees
| PROJECT first_name, last_name, height
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.mvAvgFunction',
        {
          defaultMessage: 'MV_AVG',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.mvAvgFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.mvMaxFunction',
        {
          defaultMessage: 'MV_MAX',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.mvMaxFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.mvMinFunction',
        {
          defaultMessage: 'MV_MIN',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.mvMinFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.mvSumFunction',
        {
          defaultMessage: 'MV_SUM',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.mvSumFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.powFunction',
        {
          defaultMessage: 'POW',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.powFunction.markdown',
            {
              defaultMessage: `### POW
Returns the the value of a base (first argument) raised to a power (second argument).

\`\`\`
ROW base = 2.0, exponent = 2.0 
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.roundFunction',
        {
          defaultMessage: 'ROUND',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.roundFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.splitFunction',
        {
          defaultMessage: 'SPLIT',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.splitFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.startsWithFunction',
        {
          defaultMessage: 'STARTS_WITH',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.startsWithFunction.markdown',
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.substringFunction',
        {
          defaultMessage: 'SUBSTRING',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.substringFunction.markdown',
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
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.toStringFunction',
        {
          defaultMessage: 'TO_STRING',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.toStringFunction.markdown',
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
  ],
};
