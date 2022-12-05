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
        defaultMessage: `## How it works
Elasticsearch ESQL is a piped language where you can combine aggregations, filters, transformations, and projections in a single expression.
                    
ESQL query example:
                    
\`\`\`
from index | stats average = avg(field) by field2
\`\`\`
                                        
                                      `,
      }
    )}
  />
);

export const commands = {
  label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.commands', {
    defaultMessage: 'Commands',
  }),
  description: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.commandsDescription', {
    defaultMessage: `To create Elasticsearch ESQL expressions, use the supported commands.`,
  }),
  items: [
    {
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.from', {
        defaultMessage: 'from',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.from.markdown',
            {
              defaultMessage: `### from
Retrieves data from one or more datasets. A dataset is a collection of data that you want to search. The only supported dataset is an index. 
In a query or subquery, you must use the from command first and it does not need a leading pipe.
For example, to retrieve data from an index:
              
\`\`\`
from index
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.stats', {
        defaultMessage: 'stats ... (by)',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.stats.markdown',
            {
              defaultMessage: `### stats...(by):
Calculates aggregate statistics, such as average, count, and sum, over the incoming search results set. Similar to SQL aggregation, if the stats command is used without a BY clause, only one row is returned, which is the aggregation over the entire incoming search results set. When you use a BY clause, one row is returned for each distinct value in the field specified in the BY clause. 
The stats command returns only the fields in the aggregation, and you can use a wide range of statistical functions with the stats command. When you perform more than one aggregation, separate each aggregation with a comma.
For example, to calculate the average of a field:
              
\`\`\`
from index | stats average = avg(field)
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
        defaultMessage: 'eval',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.eval.markdown',
            {
              defaultMessage: `### eval
Calculates an expression and puts the resulting value into a search results field.
For example to increment by 1 the average of a field:
\`\`\`
from index | stats average = avg(field) | eval new_average = average + 1
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
        defaultMessage: 'sort',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.sort.markdown',
            {
              defaultMessage: `### sort
Sorts all results by the specified fields. When in descending order, the results missing a field are considered the smallest possible value of the field, or the largest possible value of the field when in ascending order.
For example to sort with ascending order:
\`\`\`
from index | stats average = avg(field) | sort average asc
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
        defaultMessage: 'limit',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.limit.markdown',
            {
              defaultMessage: `### limit
Returns the first search results, in search order, based on the <limit> specified.
For example, to fetch only the top 10 results:
              
\`\`\`
from index | limit 10
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.where', {
        defaultMessage: 'where',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.where.markdown',
            {
              defaultMessage: `### where
Uses <predicate-expressions> to filter search results. A predicate expression, when evaluated, returns TRUE or FALSE. The where command only returns the results that evaluate to TRUE.
For example, to filter results for a specific field value:
              
\`\`\`
from index where field="value"
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

export const mathematicalFunctions = {
  label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.mathematicalFunctions', {
    defaultMessage: 'Mathematical functions',
  }),
  description: i18n.translate(
    'unifiedSearch.query.textBasedLanguagesEditor.mathematicalFunctionsDocumentationDescription',
    {
      defaultMessage: `Supported mathematical functions.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.roundFunction',
        {
          defaultMessage: 'round',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.roundFunction.markdown',
            {
              defaultMessage: `### round
Returns a number rounded to the decimal, specified by he closest integer value. The default is to round to an integer.
\`\`\`
from index where field="value" | 
eval rounded = round(field)
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
  label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.operators', {
    defaultMessage: 'Operators',
  }),
  description: i18n.translate(
    'unifiedSearch.query.textBasedLanguagesEditor.operatorsDocumentationDescription',
    {
      defaultMessage: `Operations you can perform with the eval command.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.AddOperator',
        {
          defaultMessage: 'Add',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.addOperator.markdown',
            {
              defaultMessage: `### Add (+)
\`\`\`
from index | stats average = avg(field) | eval new_average = average + 1
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.SubtractOperator',
        {
          defaultMessage: 'Subtract',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.subtractOperator.markdown',
            {
              defaultMessage: `### Subtract (-)
\`\`\`
from index | stats average = avg(field) | eval new_average = average - 1
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.divideOperator',
        {
          defaultMessage: 'Divide',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.divideOperator.markdown',
            {
              defaultMessage: `### Divide (/)
\`\`\`
from index | stats average = avg(field) | eval new_average = average / 10
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.multiplyOperator',
        {
          defaultMessage: 'Multiply',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.multiplyOperator.markdown',
            {
              defaultMessage: `### Multiply (*)
\`\`\`
from index | stats average = avg(field) | eval new_average = average * 10
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

export const aggregateFunctions = {
  label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.aggregateFunctions', {
    defaultMessage: 'Aggregate functions',
  }),
  description: i18n.translate(
    'unifiedSearch.query.textBasedLanguagesEditor.aggregateFunctionsDocumentationESQLDescription',
    {
      defaultMessage: `Calculates aggregate statistics, such as average, count, and sum, over the incoming search results set. This is similar to SQL aggregation.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.averageFunction',
        {
          defaultMessage: 'Average',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.averageFunction.markdown',
            {
              defaultMessage: `### avg
Returns the average of the values in a field.
\`\`\`
from index | stats average = avg(field)
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.maxFunction',
        {
          defaultMessage: 'Max',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.maxFunction.markdown',
            {
              defaultMessage: `### max
Returns the maximum value in a field.
\`\`\`
from index | stats max = max(field)
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.minFunction',
        {
          defaultMessage: 'Min',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.minFunction.markdown',
            {
              defaultMessage: `### min
Returns the minimum value in a field.
\`\`\`
from index | stats min = min(field)
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.sumFunction',
        {
          defaultMessage: 'Sum',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentationESQL.sumFunction.markdown',
            {
              defaultMessage: `### sum
Returns the sum of the values in a field.
\`\`\`
from index | stats sum = sum(field)
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
