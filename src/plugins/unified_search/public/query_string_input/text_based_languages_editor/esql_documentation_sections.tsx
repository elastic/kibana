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
      'unifiedSearch.query.textBasedLanguagesEditor.documentation.markdown',
      {
        defaultMessage: `## How it works

Elasticsearch ESQL is a piped language where you can write aggregations, filters, transformations and projections in a single expression.
                    
An example SQL query can be:
                    
\`\`\`
from "index" 
| stats average = avg("field")
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
  description: i18n.translate(
    'unifiedSearch.query.textBasedLanguagesEditor.comparisonOperatorsDocumentationDescription',
    {
      defaultMessage: `Supported commands.`,
    }
  ),
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
The from command retrieves data from one or more datasets, such as an index. The from command must be the first command in a query or subquery and does not need a leading pipe.
A dataset is a collection of data that you either want to search. For now, the only dataset that is supported is that of an index.
              
\`\`\`
from "test_emp" 
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
Calculates aggregate statistics, such as average, count, and sum, over the incoming search results set. This is similar to SQL aggregation.
If the stats command is used without a BY clause, only one row is returned, which is the aggregation over the entire incoming result set. If a BY clause is used, one row is returned for each distinct value in the field specified in the BY clause. The stats command is that the command returns only the fields used in the aggregation.
You can use a wide range of statistical functions that you can use with the stats command. When you perform more than one aggregation, separate each aggregation with a comma.
              
\`\`\`
from "index" | stats average = avg("field")
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
              defaultMessage: `### Eval
The eval command calculates an expression and puts the resulting value into a search results field.
\`\`\`
from "index" | stats average = avg("field") | eval new_average = average + 1
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
The sort command sorts all of the results by the specified fields. Results missing a given field are treated as having the smallest possible value of that field if descending or largest possible value of that field if ascending.

\`\`\`
from "index" | stats average = avg("field") | sort average desc
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
\`\`\`
from "index" | limit 10
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
The where command uses <predicate-expressions> to filter search results. A predicate expression, when evaluated, returns either TRUE or FALSE. The where command only returns the results that evaluate to TRUE.

\`\`\`
from "index" where field="value"
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
Returns a number rounded to the decimal places specified by the precision. The default is to round to an integer.
\`\`\`
from "index" where field="value" | 
eval rounded = round("field", 3)
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.equalOperator',
        {
          defaultMessage: 'Equality',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.equalOperator.markdown',
            {
              defaultMessage: `### Equality (=)
\`\`\`
from "index" | stats average = avg("field") | eval new_average = average + 1
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.AddOperator',
        {
          defaultMessage: 'Add',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.addOperator.markdown',
            {
              defaultMessage: `### Add (+)
\`\`\`
from "index" | stats average = avg("field") | eval new_average = average + 1
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.SubtractOperator',
        {
          defaultMessage: 'Subtract',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.subtractOperator.markdown',
            {
              defaultMessage: `### Subtract (-)
\`\`\`
from "index" | stats average = avg("field") | eval new_average = average - 1
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
    'unifiedSearch.query.textBasedLanguagesEditor.aggregateFunctionsDocumentationDescription',
    {
      defaultMessage: `Calculates aggregate statistics, such as average, count, and sum, over the incoming search results set. This is similar to SQL aggregation.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.averageFunction',
        {
          defaultMessage: 'Average',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.averageFunction.markdown',
            {
              defaultMessage: `### avg
Returns the average of the values in a field.
\`\`\`
from "index" | stats average = avg("field")
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.maxFunction',
        {
          defaultMessage: 'Max',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.maxFunction.markdown',
            {
              defaultMessage: `### max
Returns the maximum value in a field.

\`\`\`
from "index" | stats max = max("field")
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.minFunction',
        {
          defaultMessage: 'Min',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.minFunction.markdown',
            {
              defaultMessage: `### min
Returns the minimum value in a field.

\`\`\`
from "index" | stats min = min("field")
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.sumFunction',
        {
          defaultMessage: 'Sum',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.sumFunction.markdown',
            {
              defaultMessage: `### sum
Returns the sum of the values in a field.

\`\`\`
from "index" | stats sum = sum("field")
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
