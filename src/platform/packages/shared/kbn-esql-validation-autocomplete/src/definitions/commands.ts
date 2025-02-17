/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  type ESQLColumn,
  type ESQLCommand,
  type ESQLAstItem,
  type ESQLMessage,
  type ESQLFunction,
  isFunctionExpression,
  isWhereExpression,
  isFieldExpression,
  Walker,
} from '@kbn/esql-ast';
import {
  getFunctionDefinition,
  isAssignment,
  isColumnItem,
  isFunctionItem,
  isFunctionOperatorParam,
  isLiteralItem,
} from '../shared/helpers';
import { ENRICH_MODES } from './settings';
import {
  appendSeparatorOption,
  asOption,
  byOption,
  metadataOption,
  onOption,
  withOption,
} from './options';
import type { CommandDefinition } from './types';
import { suggest as suggestForSort } from '../autocomplete/commands/sort';
import { suggest as suggestForKeep } from '../autocomplete/commands/keep';
import { suggest as suggestForDrop } from '../autocomplete/commands/drop';
import { suggest as suggestForStats } from '../autocomplete/commands/stats';
import { suggest as suggestForWhere } from '../autocomplete/commands/where';
import { suggest as suggestForJoin } from '../autocomplete/commands/join';
import { suggest as suggestForFrom } from '../autocomplete/commands/from';
import { suggest as suggestForRow } from '../autocomplete/commands/row';
import { suggest as suggestForShow } from '../autocomplete/commands/show';
import { suggest as suggestForGrok } from '../autocomplete/commands/grok';
import { suggest as suggestForDissect } from '../autocomplete/commands/dissect';

const statsValidator = (command: ESQLCommand) => {
  const messages: ESQLMessage[] = [];
  const commandName = command.name.toUpperCase();
  if (!command.args.length) {
    messages.push({
      location: command.location,
      text: i18n.translate('kbn-esql-validation-autocomplete.esql.validation.statsNoArguments', {
        defaultMessage:
          'At least one aggregation or grouping expression required in [{commandName}]',
        values: { commandName },
      }),
      type: 'error',
      code: 'statsNoArguments',
    });
  }

  // now that all functions are supported, there's a specific check to perform
  // unfortunately the logic here is a bit complex as it needs to dig deeper into the args
  // until an agg function is detected
  // in the long run this might be integrated into the validation function
  const statsArg = command.args
    .flatMap((arg) => {
      if (isWhereExpression(arg) && isFunctionExpression(arg.args[0])) {
        arg = arg.args[0] as ESQLFunction;
      }

      return isAssignment(arg) ? arg.args[1] : arg;
    })
    .filter(isFunctionItem);

  if (statsArg.length) {
    function isAggFunction(arg: ESQLAstItem): arg is ESQLFunction {
      return isFunctionItem(arg) && getFunctionDefinition(arg.name)?.type === 'agg';
    }
    function isOtherFunction(arg: ESQLAstItem): arg is ESQLFunction {
      return isFunctionItem(arg) && getFunctionDefinition(arg.name)?.type !== 'agg';
    }

    function checkAggExistence(arg: ESQLFunction): boolean {
      if (isWhereExpression(arg)) {
        return checkAggExistence(arg.args[0] as ESQLFunction);
      }

      if (isFieldExpression(arg)) {
        const agg = arg.args[1];
        const firstFunction = Walker.match(agg, { type: 'function' });

        if (!firstFunction) {
          return false;
        }

        return checkAggExistence(firstFunction as ESQLFunction);
      }

      // TODO the grouping function check may not
      // hold true for all future cases
      if (isAggFunction(arg) || isFunctionOperatorParam(arg)) {
        return true;
      }

      if (isOtherFunction(arg)) {
        return (arg as ESQLFunction).args.filter(isFunctionItem).some(checkAggExistence);
      }

      return false;
    }
    // first check: is there an agg function somewhere?
    const noAggsExpressions = statsArg.filter((arg) => !checkAggExistence(arg));

    if (noAggsExpressions.length) {
      messages.push(
        ...noAggsExpressions.map((fn) => ({
          location: fn.location,
          text: i18n.translate(
            'kbn-esql-validation-autocomplete.esql.validation.statsNoAggFunction',
            {
              defaultMessage:
                'At least one aggregation function required in [{commandName}], found [{expression}]',
              values: {
                expression: fn.text,
                commandName,
              },
            }
          ),
          type: 'error' as const,
          code: 'statsNoAggFunction',
        }))
      );
    } else {
      function isConstantOrAggFn(arg: ESQLAstItem): boolean {
        return isLiteralItem(arg) || isAggFunction(arg);
      }
      // now check that:
      // * the agg function is at root level
      // * or if it's a builtin function, then all operands are agg functions or literals
      // * or if it's a eval function then all arguments are agg functions or literals
      function checkFunctionContent(arg: ESQLFunction) {
        // TODO the grouping function check may not
        // hold true for all future cases
        if (isAggFunction(arg)) {
          return true;
        }
        return (arg as ESQLFunction).args.every(
          (subArg): boolean =>
            isConstantOrAggFn(subArg) ||
            (isOtherFunction(subArg) ? checkFunctionContent(subArg) : false)
        );
      }
      // @TODO: improve here the check to get the last instance of the invalidExpression
      // to provide a better location for the error message
      // i.e. STATS round(round(round( a + sum(b) )))
      // should return the location of the + node, just before the agg one
      const invalidExpressions = statsArg.filter((arg) => !checkFunctionContent(arg));

      if (invalidExpressions.length) {
        messages.push(
          ...invalidExpressions.map((fn) => ({
            location: fn.location,
            text: i18n.translate(
              'kbn-esql-validation-autocomplete.esql.validation.noCombinationOfAggAndNonAggValues',
              {
                defaultMessage:
                  'Cannot combine aggregation and non-aggregation values in [{commandName}], found [{expression}]',
                values: {
                  expression: fn.text,
                  commandName,
                },
              }
            ),
            type: 'error' as const,
            code: 'statsNoCombinationOfAggAndNonAggValues',
          }))
        );
      }
    }
  }

  return messages;
};
export const commandDefinitions: Array<CommandDefinition<any>> = [
  {
    name: 'row',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.rowDoc', {
      defaultMessage:
        'Produces a row with one or more columns with values that you specify. This can be useful for testing.',
    }),
    examples: ['ROW a=1', 'ROW a=1, b=2'],
    signature: {
      multipleParams: true,
      // syntax check already validates part of this
      params: [{ name: 'assignment', type: 'any' }],
    },
    suggest: suggestForRow,
    options: [],
    modes: [],
  },
  {
    name: 'from',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.fromDoc', {
      defaultMessage:
        'Retrieves data from one or more data streams, indices, or aliases. In a query or subquery, you must use the from command first and it does not need a leading pipe. For example, to retrieve data from an index:',
    }),
    examples: ['from logs', 'from logs-*', 'from logs_*, events-*'],
    options: [metadataOption],
    modes: [],
    signature: {
      multipleParams: true,
      params: [{ name: 'index', type: 'source', wildcards: true }],
    },
    suggest: suggestForFrom,
  },
  {
    name: 'show',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.showDoc', {
      defaultMessage: 'Returns information about the deployment and its capabilities',
    }),
    examples: ['SHOW INFO'],
    options: [],
    modes: [],
    signature: {
      multipleParams: false,
      params: [{ name: 'functions', type: 'function' }],
    },
    suggest: suggestForShow,
  },
  {
    name: 'metrics',
    hidden: true,
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.metricsDoc', {
      defaultMessage:
        'A metrics-specific source command, use this command to load data from TSDB indices. ' +
        'Similar to STATS command on can calculate aggregate statistics, such as average, count, and sum, over the incoming search results set. ' +
        'When used without a BY clause, only one row is returned, which is the aggregation over the entire incoming search results set. ' +
        'When you use a BY clause, one row is returned for each distinct value in the field specified in the BY clause. ' +
        'The command returns only the fields in the aggregation, and you can use a wide range of statistical functions with the stats command. ' +
        'When you perform more than one aggregation, separate each aggregation with a comma.',
    }),
    examples: [
      'metrics index',
      'metrics index, index2',
      'metrics index avg = avg(a)',
      'metrics index sum(b) by b',
      'metrics index, index2 sum(b) by b % 2',
      'metrics <sources> [ <aggregates> [ by <grouping> ]]',
      'metrics src1, src2 agg1, agg2 by field1, field2',
    ],
    options: [],
    modes: [],
    signature: {
      multipleParams: true,
      params: [
        { name: 'index', type: 'source', wildcards: true },
        { name: 'expression', type: 'function', optional: true },
      ],
    },
  },
  {
    name: 'stats',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.statsDoc', {
      defaultMessage:
        'Calculates aggregate statistics, such as average, count, and sum, over the incoming search results set. Similar to SQL aggregation, if the stats command is used without a BY clause, only one row is returned, which is the aggregation over the entire incoming search results set. When you use a BY clause, one row is returned for each distinct value in the field specified in the BY clause. The stats command returns only the fields in the aggregation, and you can use a wide range of statistical functions with the stats command. When you perform more than one aggregation, separate each aggregation with a comma.',
    }),
    examples: ['… | stats avg = avg(a)', '… | stats sum(b) by b', '… | stats sum(b) by b % 2'],
    signature: {
      multipleParams: true,
      params: [{ name: 'expression', type: 'function', optional: true }],
    },
    options: [byOption],
    modes: [],
    validate: statsValidator,
    suggest: suggestForStats,
  },
  {
    name: 'inlinestats',
    hidden: true,
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.inlineStatsDoc',
      {
        defaultMessage:
          'Calculates an aggregate result and merges that result back into the stream of input data. Without the optional `BY` clause this will produce a single result which is appended to each row. With a `BY` clause this will produce one result per grouping and merge the result into the stream based on matching group keys.',
      }
    ),
    examples: ['… | EVAL bar = a * b | INLINESTATS m = MAX(bar) BY b'],
    signature: {
      multipleParams: true,
      params: [{ name: 'expression', type: 'function', optional: true }],
    },
    options: [byOption],
    modes: [],
    // Reusing the same validation logic as stats command
    validate: statsValidator,
  },

  {
    name: 'eval',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.evalDoc', {
      defaultMessage:
        'Calculates an expression and puts the resulting value into a search results field.',
    }),
    examples: [
      '… | eval b * c',
      '… | eval a = b * c',
      '… | eval then = now() + 1 year + 2 weeks',
      '… | eval a = b * c, d = e * f',
    ],
    signature: {
      multipleParams: true,
      params: [{ name: 'expression', type: 'any' }],
    },
    options: [],
    modes: [],
  },
  {
    name: 'rename',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.renameDoc', {
      defaultMessage: 'Renames an old column to a new one',
    }),
    examples: ['… | rename old as new', '… | rename old as new, a as b'],
    signature: {
      multipleParams: true,
      params: [{ name: 'renameClause', type: 'column' }],
    },
    options: [asOption],
    modes: [],
  },
  {
    name: 'limit',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.limitDoc', {
      defaultMessage:
        'Returns the first search results, in search order, based on the "limit" specified.',
    }),
    examples: ['… | limit 100', '… | limit 0'],
    signature: {
      multipleParams: false,
      params: [{ name: 'size', type: 'integer', constantOnly: true }],
    },
    options: [],
    modes: [],
  },
  {
    name: 'keep',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.keepDoc', {
      defaultMessage:
        'Rearranges fields in the Results table by applying the keep clauses in fields',
    }),
    examples: ['… | keep a', '… | keep a,b'],
    suggest: suggestForKeep,
    options: [],
    modes: [],
    signature: {
      multipleParams: true,
      params: [{ name: 'column', type: 'column', wildcards: true }],
    },
  },
  {
    name: 'drop',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.dropDoc', {
      defaultMessage: 'Drops columns',
    }),
    examples: ['… | drop a', '… | drop a,b'],
    options: [],
    modes: [],
    signature: {
      multipleParams: true,
      params: [{ name: 'column', type: 'column', wildcards: true }],
    },
    suggest: suggestForDrop,
    validate: (command: ESQLCommand) => {
      const messages: ESQLMessage[] = [];
      const wildcardItems = command.args.filter((arg) => isColumnItem(arg) && arg.name === '*');
      if (wildcardItems.length) {
        messages.push(
          ...wildcardItems.map((column) => ({
            location: (column as ESQLColumn).location,
            text: i18n.translate(
              'kbn-esql-validation-autocomplete.esql.validation.dropAllColumnsError',
              {
                defaultMessage: 'Removing all fields is not allowed [*]',
              }
            ),
            type: 'error' as const,
            code: 'dropAllColumnsError',
          }))
        );
      }
      const droppingTimestamp = command.args.find(
        (arg) => isColumnItem(arg) && arg.name === '@timestamp'
      );
      if (droppingTimestamp) {
        messages.push({
          location: (droppingTimestamp as ESQLColumn).location,
          text: i18n.translate(
            'kbn-esql-validation-autocomplete.esql.validation.dropTimestampWarning',
            {
              defaultMessage:
                'Drop [@timestamp] will remove all time filters to the search results',
            }
          ),
          type: 'warning',
          code: 'dropTimestampWarning',
        });
      }
      return messages;
    },
  },
  {
    name: 'sort',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.sortDoc', {
      defaultMessage:
        'Sorts all results by the specified fields. By default, null values are treated as being larger than any other value. With an ascending sort order, null values are sorted last, and with a descending sort order, null values are sorted first. You can change that by providing NULLS FIRST or NULLS LAST',
    }),
    examples: [
      '… | sort a desc, b nulls last, c asc nulls first',
      '… | sort b nulls last',
      '… | sort c asc nulls first',
      '… | sort a - abs(b)',
    ],
    options: [],
    modes: [],
    signature: {
      multipleParams: true,
      params: [{ name: 'expression', type: 'any' }],
    },
    suggest: suggestForSort,
  },

  {
    name: 'where',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.whereDoc', {
      defaultMessage:
        'Uses "predicate-expressions" to filter search results. A predicate expression, when evaluated, returns TRUE or FALSE. The where command only returns the results that evaluate to TRUE. For example, to filter results for a specific field value',
    }),
    examples: ['… | where status_code == 200'],
    signature: {
      multipleParams: false,
      params: [{ name: 'expression', type: 'boolean' }],
    },
    options: [],
    modes: [],
    suggest: suggestForWhere,
  },
  {
    name: 'dissect',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.dissectDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    examples: ['… | DISSECT a "%{b} %{c}" APPEND_SEPARATOR = ":"'],
    options: [appendSeparatorOption],
    modes: [],
    signature: {
      multipleParams: false,
      params: [
        { name: 'column', type: 'column', innerTypes: ['keyword', 'text'] },
        { name: 'pattern', type: 'string', constantOnly: true },
      ],
    },
    suggest: suggestForDissect,
  },
  {
    name: 'grok',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.grokDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    examples: ['… | GROK a "%{IP:b} %{NUMBER:c}"'],
    options: [],
    modes: [],
    signature: {
      multipleParams: false,
      params: [
        { name: 'column', type: 'column', innerTypes: ['keyword', 'text'] },
        { name: 'pattern', type: 'string', constantOnly: true },
      ],
    },
    suggest: suggestForGrok,
  },
  {
    name: 'mv_expand',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.mvExpandDoc', {
      defaultMessage: 'Expands multivalued fields into one row per value, duplicating other fields',
    }),
    examples: ['row a=[1,2,3] | mv_expand a'],
    options: [],
    modes: [],
    preview: true,
    signature: {
      multipleParams: false,
      params: [{ name: 'column', type: 'column', innerTypes: ['any'] }],
    },
  },
  {
    name: 'enrich',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.enrichDoc', {
      defaultMessage:
        'Enrich table with another table. Before you can use enrich, you need to create and execute an enrich policy.',
    }),
    examples: [
      '… | enrich my-policy',
      '… | enrich my-policy on pivotField',
      '… | enrich my-policy on pivotField with a = enrichFieldA, b = enrichFieldB',
    ],
    options: [onOption, withOption],
    modes: [ENRICH_MODES],
    signature: {
      multipleParams: false,
      params: [{ name: 'policyName', type: 'source', innerTypes: ['policy'] }],
    },
  },
  {
    name: 'hidden_command',
    description: 'A test fixture to test hidden-ness',
    hidden: true,
    examples: [],
    modes: [],
    options: [],
    signature: {
      params: [],
      multipleParams: false,
    },
  },
  {
    name: 'join',
    types: [
      // TODO: uncomment, when in the future LEFT JOIN and RIGHT JOIN are supported.
      // {
      //   name: 'left',
      //   description: i18n.translate(
      //     'kbn-esql-validation-autocomplete.esql.definitions.joinLeftDoc',
      //     {
      //       defaultMessage:
      //         'Join index with another index, keep only matching documents from the right index',
      //     }
      //   ),
      // },
      // {
      //   name: 'right',
      //   description: i18n.translate(
      //     'kbn-esql-validation-autocomplete.esql.definitions.joinRightDoc',
      //     {
      //       defaultMessage:
      //         'Join index with another index, keep only matching documents from the left index',
      //     }
      //   ),
      // },
      {
        name: 'lookup',
        description: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.definitions.joinLookupDoc',
          {
            defaultMessage: 'Join with a "lookup" mode index',
          }
        ),
      },
    ],
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.joinDoc', {
      defaultMessage: 'Join table with another table.',
    }),
    preview: true,
    examples: [
      '… | LOOKUP JOIN lookup_index ON join_field',
      // TODO: Uncomment when other join types are implemented
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index ON index.field = index2.field',
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index AS alias ON index.field = index2.field',
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index AS alias ON index.field = index2.field, index.field2 = index2.field2',
    ],
    modes: [],
    signature: {
      multipleParams: true,
      params: [{ name: 'index', type: 'source', wildcards: true }],
    },
    options: [onOption],
    suggest: suggestForJoin,
  },
];
