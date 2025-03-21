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
  type ESQLMessage,
  type ESQLFunction,
  isFunctionExpression,
  isWhereExpression,
  ESQLCommandMode,
  ESQLCommandOption,
} from '@kbn/esql-ast';
import {
  isAssignment,
  isColumnItem,
  isFunctionItem,
  isInlineCastItem,
  isLiteralItem,
  isOptionItem,
  isSingleItem,
  noCaseCompare,
} from '../shared/helpers';

import { type CommandDefinition } from './types';
import { ENRICH_MODES, checkAggExistence, checkFunctionContent } from './commands_helpers';

import { suggest as suggestForDissect } from '../autocomplete/commands/dissect';
import { suggest as suggestForDrop } from '../autocomplete/commands/drop';
import { suggest as suggestForEnrich } from '../autocomplete/commands/enrich';
import { suggest as suggestForEval } from '../autocomplete/commands/eval';
import { suggest as suggestForFrom } from '../autocomplete/commands/from';
import { suggest as suggestForGrok } from '../autocomplete/commands/grok';
import { suggest as suggestForJoin } from '../autocomplete/commands/join';
import { suggest as suggestForKeep } from '../autocomplete/commands/keep';
import { suggest as suggestForLimit } from '../autocomplete/commands/limit';
import { suggest as suggestForMvExpand } from '../autocomplete/commands/mv_expand';
import { suggest as suggestForRename } from '../autocomplete/commands/rename';
import { suggest as suggestForRow } from '../autocomplete/commands/row';
import { suggest as suggestForShow } from '../autocomplete/commands/show';
import { suggest as suggestForSort } from '../autocomplete/commands/sort';
import { suggest as suggestForStats } from '../autocomplete/commands/stats';
import { suggest as suggestForWhere } from '../autocomplete/commands/where';

import { getMessageFromId } from '../validation/errors';
import { METADATA_FIELDS } from '../shared/constants';

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
    declaration: 'ROW column1 = value1[, ..., columnN = valueN]',
    examples: ['ROW a=1', 'ROW a=1, b=2'],
    signature: {
      multipleParams: true,
      // syntax check already validates part of this
      params: [{ name: 'assignment', type: 'any' }],
    },
    suggest: suggestForRow,
  },
  {
    name: 'from',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.fromDoc', {
      defaultMessage:
        'Retrieves data from one or more data streams, indices, or aliases. In a query or subquery, you must use the from command first and it does not need a leading pipe. For example, to retrieve data from an index:',
    }),
    declaration: 'FROM index_pattern [METADATA fields]',
    examples: ['FROM logs', 'FROM logs-*', 'FROM logs_*, events-*'],
    signature: {
      multipleParams: true,
      params: [{ name: 'index', type: 'source', wildcards: true }],
    },
    suggest: suggestForFrom,
    validate: (command: ESQLCommand) => {
      const metadataStatement = command.args.find(
        (arg) => isOptionItem(arg) && arg.name === 'metadata'
      ) as ESQLCommandOption | undefined;

      if (!metadataStatement) {
        return [];
      }

      const messages: ESQLMessage[] = [];

      const fields = metadataStatement.args.filter(isColumnItem);
      for (const field of fields) {
        if (!METADATA_FIELDS.includes(field.name)) {
          messages.push(
            getMessageFromId({
              messageId: 'unknownMetadataField',
              values: {
                value: field.name,
                availableFields: Array.from(METADATA_FIELDS).join(', '),
              },
              locations: field.location,
            })
          );
        }
      }
      return messages;
    },
  },
  {
    name: 'show',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.showDoc', {
      defaultMessage: 'Returns information about the deployment and its capabilities',
    }),
    declaration: 'SHOW item',
    examples: ['SHOW INFO'],
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
    declaration: '',
    examples: [
      'METRICS index',
      'METRICS index, index2',
      'METRICS index avg = avg(a)',
      'METRICS index sum(b) by b',
      'METRICS index, index2 sum(b) by b % 2',
      'METRICS <sources> [ <aggregates> [ by <grouping> ]]',
      'METRICS src1, src2 agg1, agg2 by field1, field2',
    ],
    signature: {
      multipleParams: true,
      params: [
        { name: 'index', type: 'source', wildcards: true },
        { name: 'expression', type: 'function', optional: true },
      ],
    },
    suggest: () => [],
  },
  {
    name: 'stats',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.statsDoc', {
      defaultMessage:
        'Calculates aggregate statistics, such as average, count, and sum, over the incoming search results set. Similar to SQL aggregation, if the stats command is used without a BY clause, only one row is returned, which is the aggregation over the entire incoming search results set. When you use a BY clause, one row is returned for each distinct value in the field specified in the BY clause. The stats command returns only the fields in the aggregation, and you can use a wide range of statistical functions with the stats command. When you perform more than one aggregation, separate each aggregation with a comma.',
    }),
    declaration: `STATS [column1 =] expression1 [WHERE boolean_expression1][,
      ...,
      [columnN =] expressionN [WHERE boolean_expressionN]]
      [BY grouping_expression1[, ..., grouping_expressionN]]`,
    examples: ['… | stats avg = avg(a)', '… | stats sum(b) by b', '… | stats sum(b) by b % 2'],
    signature: {
      multipleParams: true,
      params: [{ name: 'expression', type: 'function', optional: true }],
    },
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
    declaration: '',
    examples: ['… | EVAL bar = a * b | INLINESTATS m = MAX(bar) BY b'],
    signature: {
      multipleParams: true,
      params: [{ name: 'expression', type: 'function', optional: true }],
    },
    // Reusing the same validation logic as stats command
    validate: statsValidator,
    suggest: () => [],
  },

  {
    name: 'eval',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.evalDoc', {
      defaultMessage:
        'Calculates an expression and puts the resulting value into a search results field.',
    }),
    declaration: 'EVAL [column1 =] value1[, ..., [columnN =] valueN]',
    examples: [
      '… | EVAL b * c',
      '… | EVAL a = b * c',
      '… | EVAL then = NOW() + 1 year + 2 weeks',
      '… | EVAL a = b * c, d = e * f',
    ],
    signature: {
      multipleParams: true,
      params: [{ name: 'expression', type: 'any' }],
    },
    suggest: suggestForEval,
  },
  {
    name: 'rename',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.renameDoc', {
      defaultMessage: 'Renames an old column to a new one',
    }),
    declaration: 'RENAME old_name1 AS new_name1[, ..., old_nameN AS new_nameN]',
    examples: ['… | RENAME old AS new', '… | RENAME old AS new, a AS b'],
    signature: {
      multipleParams: true,
      params: [{ name: 'renameClause', type: 'column' }],
    },
    suggest: suggestForRename,
  },
  {
    name: 'limit',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.limitDoc', {
      defaultMessage:
        'Returns the first search results, in search order, based on the "limit" specified.',
    }),
    declaration: 'LIMIT max_number_of_rows',
    examples: ['… | LIMIT 100', '… | LIMIT 1'],
    signature: {
      multipleParams: false,
      params: [{ name: 'size', type: 'integer', constantOnly: true }],
    },
    suggest: suggestForLimit,
  },
  {
    name: 'keep',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.keepDoc', {
      defaultMessage:
        'Rearranges fields in the Results table by applying the keep clauses in fields',
    }),
    declaration: 'KEEP column1[, ..., columnN]',
    examples: ['… | KEEP a', '… | KEEP a, b'],
    suggest: suggestForKeep,
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
    declaration: 'DROP column1[, ..., columnN]',
    examples: ['… | DROP a', '… | DROP a, b'],
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
    declaration:
      'SORT column1 [ASC/DESC][NULLS FIRST/NULLS LAST][, ..., columnN [ASC/DESC][NULLS FIRST/NULLS LAST]]',
    examples: [
      '… | SORT a DESC, b NULLS LAST, c ASC NULLS FIRST',
      '… | SORT b NULLS LAST',
      '… | SORT c ASC NULLS FIRST',
      '… | SORT a - abs(b)',
    ],
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
    declaration: 'WHERE expression',
    examples: ['… | WHERE status_code == 200'],
    signature: {
      multipleParams: false,
      params: [{ name: 'expression', type: 'boolean' }],
    },
    suggest: suggestForWhere,
  },
  {
    name: 'dissect',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.dissectDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    declaration: 'DISSECT input "pattern" [APPEND_SEPARATOR="<separator>"]',
    examples: ['… | DISSECT a "%{b} %{c}" APPEND_SEPARATOR = ":"'],
    signature: {
      multipleParams: false,
      params: [
        { name: 'column', type: 'column', innerTypes: ['keyword', 'text'] },
        { name: 'pattern', type: 'string', constantOnly: true },
      ],
    },
    suggest: suggestForDissect,
    validate: (command: ESQLCommand) => {
      const appendSeparatorClause = command.args.find((arg) => isOptionItem(arg)) as
        | ESQLCommandOption
        | undefined;

      if (!appendSeparatorClause) {
        return [];
      }

      if (appendSeparatorClause.name !== 'append_separator') {
        return [
          getMessageFromId({
            messageId: 'unknownDissectKeyword',
            values: { keyword: appendSeparatorClause.name },
            locations: appendSeparatorClause.location,
          }),
        ];
      }

      const messages: ESQLMessage[] = [];
      const [firstArg] = appendSeparatorClause.args;
      if (
        !Array.isArray(firstArg) &&
        (!isLiteralItem(firstArg) || firstArg.literalType !== 'keyword')
      ) {
        const value =
          'value' in firstArg && !isInlineCastItem(firstArg) ? firstArg.value : firstArg.name;
        messages.push(
          getMessageFromId({
            messageId: 'wrongDissectOptionArgumentType',
            values: { value: value ?? '' },
            locations: firstArg.location,
          })
        );
      }
      return messages;
    },
  },
  {
    name: 'grok',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.grokDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    declaration: 'GROK input "pattern"',
    examples: ['… | GROK a "%{IP:b} %{NUMBER:c}"'],
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
    declaration: 'MV_EXPAND column',
    examples: ['ROW a=[1,2,3] | MV_EXPAND a'],
    preview: true,
    signature: {
      multipleParams: false,
      params: [{ name: 'column', type: 'column', innerTypes: ['any'] }],
    },
    suggest: suggestForMvExpand,
  },
  {
    name: 'enrich',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.enrichDoc', {
      defaultMessage:
        'Enrich table with another table. Before you can use enrich, you need to create and execute an enrich policy.',
    }),
    declaration:
      'ENRICH policy [ON match_field] [WITH [new_name1 = ]field1, [new_name2 = ]field2, ...]',
    examples: [
      '… | ENRICH my-policy',
      '… | ENRICH my-policy ON pivotField',
      '… | ENRICH my-policy ON pivotField WITH a = enrichFieldA, b = enrichFieldB',
    ],
    signature: {
      multipleParams: false,
      params: [{ name: 'policyName', type: 'source', innerTypes: ['policy'] }],
    },
    suggest: suggestForEnrich,
    validate: (command: ESQLCommand) => {
      const modeArg = command.args.find((arg) => isSingleItem(arg) && arg.type === 'mode') as
        | ESQLCommandMode
        | undefined;

      if (!modeArg) {
        return [];
      }

      const acceptedValues = ENRICH_MODES.map(({ name }) => '_' + name);
      if (acceptedValues.some((value) => noCaseCompare(modeArg.text, value))) {
        return [];
      }

      return [
        getMessageFromId({
          messageId: 'unsupportedMode',
          values: {
            command: 'ENRICH',
            value: modeArg.text,
            expected: acceptedValues.join(', '),
          },
          locations: modeArg.location,
        }),
      ];
    },
  },
  {
    name: 'hidden_command',
    description: 'A test fixture to test hidden-ness',
    declaration: '',
    hidden: true,
    examples: [],
    signature: {
      params: [],
      multipleParams: false,
    },
    suggest: () => [],
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
    declaration: `LOOKUP JOIN <lookup_index> ON <field_name>`,
    preview: true,
    examples: [
      '… | LOOKUP JOIN lookup_index ON join_field',
      // TODO: Uncomment when other join types are implemented
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index ON index.field = index2.field',
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index AS alias ON index.field = index2.field',
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index AS alias ON index.field = index2.field, index.field2 = index2.field2',
    ],
    signature: {
      multipleParams: true,
      params: [{ name: 'index', type: 'source', wildcards: true }],
    },
    suggest: suggestForJoin,
  },
];
