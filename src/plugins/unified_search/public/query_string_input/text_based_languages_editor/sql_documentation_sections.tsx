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

With Elasticsearch SQL, you can access that full text search, 
blazing speed, and effortless scalability with a familiar query syntax.
can use SQL to search and aggregate data natively inside Elasticsearch. 
One can think of Elasticsearch SQL as a translator, 
one that understands both SQL and Elasticsearch and makes it easy
to read and process data in real-time.
                    
An example SQL query can be:
                    
\`\`\`
SELECT * FROM library 
ORDER BY page_count DESC LIMIT 5
\`\`\`
                    
As a general rule, Elasticsearch SQL as the name indicates provides a SQL interface to Elasticsearch.
As such, it follows the SQL terminology and conventions first, whenever possible.
                    
Elasticsearch SQL currently accepts only one command at a time. A command is a sequence of tokens terminated by the end of input stream.
                    
Elasticsearch SQL provides a comprehensive set of built-in operators and functions.
                    
                                      `,
      }
    )}
  />
);

export const comparisonOperators = {
  label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.comparisonOperators', {
    defaultMessage: 'Comparison operators',
  }),
  description: i18n.translate(
    'unifiedSearch.query.textBasedLanguagesEditor.comparisonOperatorsDocumentationDescription',
    {
      defaultMessage: `Boolean operator for comparing against one or multiple expressions.`,
    }
  ),
  items: [
    {
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.equality', {
        defaultMessage: 'Equality',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.equality.markdown',
            {
              defaultMessage: `### Equality (=)
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no = 10000 LIMIT 5;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.nullSafeEquality',
        {
          defaultMessage: 'Null safe equality (<=>)',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.nullSafeEquality.markdown',
            {
              defaultMessage: `### Null safe equality:
\`\`\`
SELECT 'elastic' <=> null AS "equals";

    equals
---------------
false;
\`\`\`
\`\`\`
SELECT null <=> null AS "equals";

    equals
---------------
true;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.inequality',
        {
          defaultMessage: 'Inequality',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.inequality.markdown',
            {
              defaultMessage: `### Inequality (<> or !=)
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no <> 10000 ORDER BY emp_no LIMIT 5;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.comparison',
        {
          defaultMessage: 'Comparison',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.comparison.markdown',
            {
              defaultMessage: `### Comparison (<, <=, >, >=)
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no < 10003 ORDER BY emp_no LIMIT 5;
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
      label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.between', {
        defaultMessage: 'Between',
      }),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.between.markdown',
            {
              defaultMessage: `### Between
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no BETWEEN 9990 AND 10003 ORDER BY emp_no;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.nullNotNull',
        {
          defaultMessage: 'IS NULL and IS NOT NULL',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.nullNotNull.markdown',
            {
              defaultMessage: `### IS NULL/IS NOT NULL
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no IS NOT NULL AND gender IS NULL;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.inOperator',
        {
          defaultMessage: 'IN',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.inOperator.markdown',
            {
              defaultMessage: `### IN (<value1>, <value2>, ...)
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no IN (10000, 10001, 10002, 999) ORDER BY emp_no LIMIT 5;
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

export const logicalOperators = {
  label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.logicalOperators', {
    defaultMessage: 'Logical operators',
  }),
  description: i18n.translate(
    'unifiedSearch.query.textBasedLanguagesEditor.logicalOperatorsDocumentationDescription',
    {
      defaultMessage: `Boolean operator for evaluating one or two expressions.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.AndOperator',
        {
          defaultMessage: 'AND',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.andOperator.markdown',
            {
              defaultMessage: `### AND
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no > 10000 AND emp_no < 10005 ORDER BY emp_no LIMIT 5;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.OrOperator',
        {
          defaultMessage: 'OR',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.orOperator.markdown',
            {
              defaultMessage: `### OR
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no < 10003 OR emp_no = 10005 ORDER BY emp_no LIMIT 5;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.NotOperator',
        {
          defaultMessage: 'NOT',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.notOperator.markdown',
            {
              defaultMessage: `### NOT
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE NOT emp_no = 10000 LIMIT 5;
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

export const mathOperators = {
  label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.mathOperators', {
    defaultMessage: 'Math operators',
  }),
  description: i18n.translate(
    'unifiedSearch.query.textBasedLanguagesEditor.mathOperatorsDocumentationDescription',
    {
      defaultMessage: `Perform mathematical operations affecting one or two values. The result is a value of numeric type..`,
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
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.addOperator.markdown',
            {
              defaultMessage: `### Add (+)
\`\`\`
SELECT 1 + 1 AS x;
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
              defaultMessage: `### Subtract (infix -)
\`\`\`
SELECT 1 - 1 AS x;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.negateOperator',
        {
          defaultMessage: 'Negate',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.negateOperator.markdown',
            {
              defaultMessage: `### Negate (unary -)
\`\`\`
SELECT - 1 AS x;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.multiplyOperator',
        {
          defaultMessage: 'Multiply',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.multiplyOperator.markdown',
            {
              defaultMessage: `### Multiply (*)
\`\`\`
SELECT 2 * 3 AS x;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.divideOperator',
        {
          defaultMessage: 'Divide',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.divideOperator.markdown',
            {
              defaultMessage: `### Divide (/)
\`\`\`
SELECT 6 / 3 AS x;
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
        'unifiedSearch.query.textBasedLanguagesEditor.documentation.moduloOperator',
        {
          defaultMessage: 'Modulo or remainder',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'unifiedSearch.query.textBasedLanguagesEditor.documentation.moduloOperator.markdown',
            {
              defaultMessage: `### Modulo or remainder(%)
\`\`\`
SELECT 5 % 2 AS x;
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
