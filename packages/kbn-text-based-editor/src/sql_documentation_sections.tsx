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
      'textBasedEditor.query.textBasedLanguagesEditor.documentation.markdown',
      {
        defaultMessage: `## About Elasticsearch SQL

Use Elasticsearch SQL to search and aggregate data inside Elasticsearch. This query language provides full text search with a familiar syntax. Here is an example query:
                    
\`\`\`
SELECT * FROM library 
ORDER BY page_count DESC LIMIT 5
\`\`\`
                    
Elasticsearch SQL:

- Provides a comprehensive set of built-in operators and functions.
- Follows SQL terminology and conventions.
- Accepts one command per line. A command is a sequence of tokens terminated by the end of input stream
                    
                                      `,
      }
    )}
  />
);

export const comparisonOperators = {
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.comparisonOperators', {
    defaultMessage: 'Comparison operators',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.comparisonOperatorsDocumentationDescription',
    {
      defaultMessage: `Boolean operator for comparing against one or multiple expressions.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.equality',
        {
          defaultMessage: 'Equality',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.equality.markdown',
            {
              defaultMessage: `### Equality (=)
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no = 10000 LIMIT 5
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.nullSafeEquality',
        {
          defaultMessage: 'Null safe equality (<=>)',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.nullSafeEquality.markdown',
            {
              defaultMessage: `### Null safe equality:
\`\`\`
SELECT 'elastic' <=> null AS "equals"

    equals
---------------
false
\`\`\`
\`\`\`
SELECT null <=> null AS "equals"

    equals
---------------
true
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.inequality',
        {
          defaultMessage: 'Inequality',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.inequality.markdown',
            {
              defaultMessage: `### Inequality (<> or !=)
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no <> 10000 ORDER BY emp_no LIMIT 5
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.comparison',
        {
          defaultMessage: 'Comparison',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.comparison.markdown',
            {
              defaultMessage: `### Comparison (<, <=, >, >=)
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no < 10003 ORDER BY emp_no LIMIT 5
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.between',
        {
          defaultMessage: 'Between',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.between.markdown',
            {
              defaultMessage: `### Between
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no BETWEEN 9990 AND 10003 ORDER BY emp_no
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.nullNotNull',
        {
          defaultMessage: 'IS NULL and IS NOT NULL',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.nullNotNull.markdown',
            {
              defaultMessage: `### IS NULL/IS NOT NULL
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no IS NOT NULL AND gender IS NULL
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.inOperator',
        {
          defaultMessage: 'IN',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.inOperator.markdown',
            {
              defaultMessage: `### IN (<value1>, <value2>, ...)
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no IN (10000, 10001, 10002, 999) ORDER BY emp_no LIMIT 5
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
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.logicalOperators', {
    defaultMessage: 'Logical operators',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.logicalOperatorsDocumentationDescription',
    {
      defaultMessage: `Boolean operator for evaluating one or two expressions.`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.AndOperator',
        {
          defaultMessage: 'AND',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.andOperator.markdown',
            {
              defaultMessage: `### AND
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no > 10000 AND emp_no < 10005 ORDER BY emp_no LIMIT 5
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.OrOperator',
        {
          defaultMessage: 'OR',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.orOperator.markdown',
            {
              defaultMessage: `### OR
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE emp_no < 10003 OR emp_no = 10005 ORDER BY emp_no LIMIT 5
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.NotOperator',
        {
          defaultMessage: 'NOT',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.notOperator.markdown',
            {
              defaultMessage: `### NOT
\`\`\`
SELECT last_name l FROM "test_emp" 
WHERE NOT emp_no = 10000 LIMIT 5
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
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.mathOperators', {
    defaultMessage: 'Math operators',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.mathOperatorsDocumentationDescription',
    {
      defaultMessage: `Perform mathematical operations affecting one or two values. The result is a value of numeric type..`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.AddOperator',
        {
          defaultMessage: 'Add',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.addOperator.markdown',
            {
              defaultMessage: `### Add (+)
\`\`\`
SELECT 1 + 1 AS x
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.SubtractOperator',
        {
          defaultMessage: 'Subtract',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.subtractOperator.markdown',
            {
              defaultMessage: `### Subtract (infix -)
\`\`\`
SELECT 1 - 1 AS x
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.negateOperator',
        {
          defaultMessage: 'Negate',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.negateOperator.markdown',
            {
              defaultMessage: `### Negate (unary -)
\`\`\`
SELECT - 1 AS x
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.multiplyOperator',
        {
          defaultMessage: 'Multiply',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.multiplyOperator.markdown',
            {
              defaultMessage: `### Multiply (*)
\`\`\`
SELECT 2 * 3 AS x
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.divideOperator',
        {
          defaultMessage: 'Divide',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.divideOperator.markdown',
            {
              defaultMessage: `### Divide (/)
\`\`\`
SELECT 6 / 3 AS x
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.moduloOperator',
        {
          defaultMessage: 'Modulo or remainder',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.moduloOperator.markdown',
            {
              defaultMessage: `### Modulo or remainder(%)
\`\`\`
SELECT 5 % 2 AS x
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
  label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.aggregateFunctions', {
    defaultMessage: 'Aggregate functions',
  }),
  description: i18n.translate(
    'textBasedEditor.query.textBasedLanguagesEditor.aggregateFunctionsDocumentationDescription',
    {
      defaultMessage: `Functions for computing a single result from a set of input values. Elasticsearch SQL supports aggregate functions only alongside grouping (implicit or explicit).`,
    }
  ),
  items: [
    {
      label: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.averageFunction',
        {
          defaultMessage: 'Average',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.averageFunction.markdown',
            {
              defaultMessage: `### AVG
Returns the Average (arithmetic mean) of input values.
\`\`\`
AVG(numeric_field)
\`\`\`
- numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.
\`\`\`
SELECT AVG(salary) AS avg FROM emp
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.countFunction',
        {
          defaultMessage: 'Count',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.countFunction.markdown',
            {
              defaultMessage: `### Count
Returns the total number (count) of input values.


\`\`\`
COUNT(expression)
\`\`\`
- expression. a field name, wildcard (*) or any numeric value. For COUNT(*) or COUNT(<literal>), all values are considered, including null or missing ones. For COUNT(<field_name>), null values are not considered.
\`\`\`
SELECT COUNT(*) AS count FROM emp
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.countAllFunction',
        {
          defaultMessage: 'Count (All)',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.countAllFunction.markdown',
            {
              defaultMessage: `### Count (All)
Returns the total number (count) of all non-null input values. COUNT(<field_name>) and COUNT(ALL <field_name>) are equivalent.

\`\`\`
COUNT(ALL field_name) 
\`\`\`
- a field name. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.
\`\`\`
SELECT COUNT(ALL last_name) AS count_all, COUNT(DISTINCT last_name) count_distinct FROM emp
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.countDistinctFunction',
        {
          defaultMessage: 'Count (Distinct)',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.countDistinctFunction.markdown',
            {
              defaultMessage: `### Count (Distinct)
Returns the total number of distinct non-null values in input values.

\`\`\`
COUNT(DISTINCT field_name)
\`\`\`
- Input: a field name.
- Output: numeric value. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.
\`\`\`
SELECT COUNT(DISTINCT hire_date) unique_hires, COUNT(hire_date) AS hires FROM emp

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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.firstFunction',
        {
          defaultMessage: 'First / First_value',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.firstFunction.markdown',
            {
              defaultMessage: `### FIRST / FIRST_VALUE
Returns the first non-null value (if such exists) of the field_name input column sorted by the ordering_field_name column. If ordering_field_name is not provided, only the field_name column is used for the sorting. 

\`\`\`
FIRST(
  field_name               
  [, ordering_field_name])
\`\`\`
- field name: target field for the aggregation
- ordering_field_name: optional field used for ordering.

\`\`\`
SELECT gender, FIRST(first_name, birth_date) FROM emp GROUP BY gender ORDER BY gender
\`\`\`

- FIRST cannot be used in a HAVING clause.
- FIRST cannot be used with columns of type text unless the field is also saved as a keyword.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.lastFunction',
        {
          defaultMessage: 'Last / Last_value',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.lastFunction.markdown',
            {
              defaultMessage: `### LAST / LAST_VALUE
It is the inverse of FIRST/FIRST_VALUE. Returns the last non-null value (if such exists) of the field_name input column sorted descending by the ordering_field_name column. If ordering_field_name is not provided, only the field_name column is used for the sorting.  

\`\`\`
LAST(
  field_name               
  [, ordering_field_name])
\`\`\`
- field name: target field for the aggregation
- ordering_field_name: optional field used for ordering.
\`\`\`
SELECT gender, LAST(first_name) FROM emp GROUP BY gender ORDER BY gender
\`\`\`
- LAST cannot be used in a HAVING clause.
- LAST cannot be used with columns of type text unless the field is also saved as a keyword.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.maxFunction',
        {
          defaultMessage: 'Max',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.maxFunction.markdown',
            {
              defaultMessage: `### MAX
Returns the maximum value across input values in the field field_name.

\`\`\`
MAX(field_name) 
\`\`\`
- a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT MAX(salary) AS max FROM emp
\`\`\`

- MAX on a field of type text or keyword is translated into FIRST/FIRST_VALUE and therefore, it cannot be used in HAVING clause.

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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.minFunction',
        {
          defaultMessage: 'Min',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.minFunction.markdown',
            {
              defaultMessage: `### MIN
Returns the minimum value across input values in the field field_name.

\`\`\`
MIN(field_name) 
\`\`\`
- a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT MIN(salary) AS min FROM emp
\`\`\`

- MIN on a field of type text or keyword is translated into FIRST/FIRST_VALUE and therefore, it cannot be used in HAVING clause.
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.sumFunction',
        {
          defaultMessage: 'Sum',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.sumFunction.markdown',
            {
              defaultMessage: `### SUM
Returns the sum of input values in the field field_name.

\`\`\`
SUM(field_name) 
\`\`\`
- a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT SUM(salary) AS sum FROM emp
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.kurtosisFunction',
        {
          defaultMessage: 'Kurtosis',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.kurtosisFunction.markdown',
            {
              defaultMessage: `### KURTOSIS
Quantify the shape of the distribution of input values in the field field_name.

\`\`\`
KURTOSIS(field_name) 
\`\`\`
- a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT MIN(salary) AS min, MAX(salary) AS max, KURTOSIS(salary) AS k FROM emp
\`\`\`

- KURTOSIS cannot be used on top of scalar functions or operators but only directly on a field. 
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.madFunction',
        {
          defaultMessage: 'Mad',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.madFunction.markdown',
            {
              defaultMessage: `### MAD
Measure the variability of the input values in the field field_name.

\`\`\`
MAD(field_name) 
\`\`\`
- a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT MIN(salary) AS min, MAX(salary) AS max, AVG(salary) AS avg, MAD(salary) AS mad FROM emp
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.percentileFunction',
        {
          defaultMessage: 'Percentile',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.percentileFunction.markdown',
            {
              defaultMessage: `### PERCENTILE
Returns the nth percentile (represented by numeric_exp parameter) of input values in the field field_name.

\`\`\`
PERCENTILE(
  field_name,         
  percentile[,        
  method[,            
  method_parameter]])
\`\`\`
- field_name : a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.
- percentile : a numeric expression (must be a constant and not based on a field). If null, the function returns null.
- method : optional string literal for the percentile algorithm. Possible values: tdigest or hdr. Defaults to tdigest.
- method_parameter : optional numeric literal that configures the percentile algorithm. Configures compression for tdigest or number_of_significant_value_digits for hdr. The default is the same as that of the backing algorithm.

\`\`\`
SELECT
    languages,
    PERCENTILE(salary, 97.3, 'tdigest', 100.0) AS "97.3_TDigest",
    PERCENTILE(salary, 97.3, 'hdr', 3) AS "97.3_HDR"
FROM emp
GROUP BY languages
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.percentileRankFunction',
        {
          defaultMessage: 'Percentile rank',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.percentileRankFunction.markdown',
            {
              defaultMessage: `### PERCENTILE_RANK
Returns the nth percentile rank (represented by numeric_exp parameter) of input values in the field field_name.

\`\`\`
PERCENTILE_RANK(
  field_name,         
  value[,             
  method[,            
  method_parameter]]) 
\`\`\`
- field_name : a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.
- percentile : a numeric expression (must be a constant and not based on a field). If null, the function returns null.
- method : optional string literal for the percentile algorithm. Possible values: tdigest or hdr. Defaults to tdigest.
- method_parameter : optional numeric literal that configures the percentile algorithm. Configures compression for tdigest or number_of_significant_value_digits for hdr. The default is the same as that of the backing algorithm.

\`\`\`
SELECT
    languages,
    ROUND(PERCENTILE_RANK(salary, 65000, 'tdigest', 100.0), 2) AS "rank_TDigest",
    ROUND(PERCENTILE_RANK(salary, 65000, 'hdr', 3), 2) AS "rank_HDR"
FROM emp
GROUP BY languages
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.skewnessFunction',
        {
          defaultMessage: 'Skewness',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.skewnessFunction.markdown',
            {
              defaultMessage: `### SKEWNESS
Quantify the asymmetric distribution of input values in the field field_name.

\`\`\`
SKEWNESS(field_name) 
\`\`\`
- field_name : a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT MIN(salary) AS min, MAX(salary) AS max, SKEWNESS(salary) AS s FROM emp
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.stsdevpopFunction',
        {
          defaultMessage: 'STDDEV_POP',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.stsdevpopFunction.markdown',
            {
              defaultMessage: `### STDDEV_POP
Returns the population standard deviation of input values in the field field_name.

\`\`\`
STDDEV_POP(field_name) 
\`\`\`
- field_name : a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT MIN(salary) AS min, MAX(salary) AS max, STDDEV_POP(salary) AS stddev FROM emp
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.stsdevsampFunction',
        {
          defaultMessage: 'STDDEV_SAMP',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.stsdevsampFunction.markdown',
            {
              defaultMessage: `### STDDEV_SAMP
Returns the sample standard deviation of input values in the field field_name.

\`\`\`
STDDEV_SAMP(field_name) 
\`\`\`
- field_name : a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT MIN(salary) AS min, MAX(salary) AS max, STDDEV_SAMP(salary) AS stddev FROM emp
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.sumofsquaresFunction',
        {
          defaultMessage: 'Sum of squares',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.sumofsquaresFunction.markdown',
            {
              defaultMessage: `### SUM_OF_SQUARES
Returns the sum of squares of input values in the field field_name.

\`\`\`
SUM_OF_SQUARES(field_name) 
\`\`\`
- field_name : a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT MIN(salary) AS min, MAX(salary) AS max, SUM_OF_SQUARES(salary) AS sumsq
       FROM emp
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.varpopFunction',
        {
          defaultMessage: 'VAR_POP',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.varpopFunction.markdown',
            {
              defaultMessage: `### VAR_POP
Returns the population variance of input values in the field field_name.

\`\`\`
VAR_POP(field_name) 
\`\`\`
- field_name : a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT MIN(salary) AS min, MAX(salary) AS max, VAR_POP(salary) AS varpop FROM emp
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
        'textBasedEditor.query.textBasedLanguagesEditor.documentation.varsampFunction',
        {
          defaultMessage: 'VAR_SAMP',
        }
      ),
      description: (
        <Markdown
          markdown={i18n.translate(
            'textBasedEditor.query.textBasedLanguagesEditor.documentation.varsampFunction.markdown',
            {
              defaultMessage: `### VAR_SAMP
Returns the sample variance of input values in the field field_name.

\`\`\`
VAR_SAMP(field_name) 
\`\`\`
- field_name : a numeric field. If this field contains only null values, the function returns null. Otherwise, the function ignores null values in this field.

\`\`\`
SELECT MIN(salary) AS min, MAX(salary) AS max, VAR_SAMP(salary) AS varsamp FROM emp
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
