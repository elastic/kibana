/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  ESQLCommandOption,
  isFunctionExpression,
  isWhereExpression,
  type ESQLColumn,
  type ESQLCommand,
  type ESQLFunction,
  type ESQLMessage,
  ESQLSource,
} from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import {
  hasWildcard,
  isAssignment,
  isColumnItem,
  isFunctionItem,
  isInlineCastItem,
  isLiteralItem,
  isOptionItem,
} from '../shared/helpers';

import {
  ENRICH_MODES,
  checkAggExistence,
  checkFunctionContent,
  validateColumnForGrokDissect,
} from './commands_helpers';
import { type CommandDefinition } from './types';

import {
  suggest as suggestForDissect,
  fieldsSuggestionsAfter as fieldsSuggestionsAfterDissect,
} from '../autocomplete/commands/dissect';
import {
  suggest as suggestForDrop,
  fieldsSuggestionsAfter as fieldsSuggestionsAfterDrop,
} from '../autocomplete/commands/drop';
import { suggest as suggestForEnrich } from '../autocomplete/commands/enrich';
import { suggest as suggestForEval } from '../autocomplete/commands/eval';
import {
  suggest as suggestForFork,
  fieldsSuggestionsAfter as fieldsSuggestionsAfterFork,
} from '../autocomplete/commands/fork';
import { suggest as suggestForFrom } from '../autocomplete/commands/from';
import { suggest as suggestForTimeseries } from '../autocomplete/commands/timeseries';
import { validate as validateCompletion } from '../validation/commands/completion';
import {
  suggest as suggestForGrok,
  fieldsSuggestionsAfter as fieldsSuggestionsAfterGrok,
} from '../autocomplete/commands/grok';
import { suggest as suggestForJoin } from '../autocomplete/commands/join';
import {
  suggest as suggestForKeep,
  fieldsSuggestionsAfter as fieldsSuggestionsAfterKeep,
} from '../autocomplete/commands/keep';
import { suggest as suggestForLimit } from '../autocomplete/commands/limit';
import { suggest as suggestForMvExpand } from '../autocomplete/commands/mv_expand';
import {
  suggest as suggestForRename,
  fieldsSuggestionsAfter as fieldsSuggestionsAfterRename,
} from '../autocomplete/commands/rename';
import { suggest as suggestForRrf } from '../autocomplete/commands/rrf';
import { validate as validateRrf } from '../validation/commands/rrf';
import { suggest as suggestForRow } from '../autocomplete/commands/row';
import { suggest as suggestForShow } from '../autocomplete/commands/show';
import { suggest as suggestForSort } from '../autocomplete/commands/sort';
import {
  suggest as suggestForCompletion,
  fieldsSuggestionsAfter as fieldsSuggestionsAfterCompletion,
} from '../autocomplete/commands/completion';
import {
  suggest as suggestForStats,
  fieldsSuggestionsAfter as fieldsSuggestionsAfterStats,
} from '../autocomplete/commands/stats';
import { suggest as suggestForWhere } from '../autocomplete/commands/where';
import {
  suggest as suggestForChangePoint,
  fieldsSuggestionsAfter as fieldsSuggestionsAfterChangePoint,
} from '../autocomplete/commands/change_point';
import { suggest as suggestForSample } from '../autocomplete/commands/sample';

import { METADATA_FIELDS } from '../shared/constants';
import { getMessageFromId } from '../validation/errors';
import { isNumericType } from '../shared/esql_types';

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
    suggest: suggestForShow,
  },
  {
    name: 'ts',
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
    examples: ['TS index', 'TS index, index2'],
    suggest: suggestForTimeseries,
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
    validate: statsValidator,
    suggest: suggestForStats,
    fieldsSuggestionsAfter: fieldsSuggestionsAfterStats,
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
    suggest: suggestForEval,
  },
  {
    name: 'rename',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.renameDoc', {
      defaultMessage: 'Renames an old column to a new one',
    }),
    declaration: 'RENAME old_name1 AS new_name1[, ..., old_nameN AS new_nameN]',
    examples: ['… | RENAME old AS new', '… | RENAME old AS new, a AS b'],
    suggest: suggestForRename,
    fieldsSuggestionsAfter: fieldsSuggestionsAfterRename,
  },
  {
    name: 'limit',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.limitDoc', {
      defaultMessage:
        'Returns the first search results, in search order, based on the "limit" specified.',
    }),
    declaration: 'LIMIT max_number_of_rows',
    examples: ['… | LIMIT 100', '… | LIMIT 1'],
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
    fieldsSuggestionsAfter: fieldsSuggestionsAfterKeep,
  },
  {
    name: 'drop',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.dropDoc', {
      defaultMessage: 'Drops columns',
    }),
    declaration: 'DROP column1[, ..., columnN]',
    examples: ['… | DROP a', '… | DROP a, b'],
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
    fieldsSuggestionsAfter: fieldsSuggestionsAfterDrop,
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
    suggest: suggestForDissect,
    validate: (command: ESQLCommand, references) => {
      const messages: ESQLMessage[] = validateColumnForGrokDissect(command, references);

      const appendSeparatorClause = command.args.find((arg) => isOptionItem(arg)) as
        | ESQLCommandOption
        | undefined;

      if (!appendSeparatorClause) {
        return messages;
      }

      if (appendSeparatorClause.name !== 'append_separator') {
        messages.push(
          getMessageFromId({
            messageId: 'unknownDissectKeyword',
            values: { keyword: appendSeparatorClause.name },
            locations: appendSeparatorClause.location,
          })
        );
        return messages;
      }

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
            values: { value: (value as string | number) ?? '' },
            locations: firstArg.location,
          })
        );
      }
      return messages;
    },
    fieldsSuggestionsAfter: fieldsSuggestionsAfterDissect,
  },
  {
    name: 'grok',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.grokDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    declaration: 'GROK input "pattern"',
    examples: ['… | GROK a "%{IP:b} %{NUMBER:c}"'],
    suggest: suggestForGrok,
    validate: validateColumnForGrokDissect,
    fieldsSuggestionsAfter: fieldsSuggestionsAfterGrok,
  },
  {
    name: 'mv_expand',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.mvExpandDoc', {
      defaultMessage: 'Expands multivalued fields into one row per value, duplicating other fields',
    }),
    declaration: 'MV_EXPAND column',
    examples: ['ROW a=[1,2,3] | MV_EXPAND a'],
    preview: true,
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
    suggest: suggestForEnrich,
    validate: (command: ESQLCommand, { policies }) => {
      const messages: ESQLMessage[] = [];
      const source = command.args[0] as ESQLSource;
      const cluster = source.prefix;
      const index = source.index;

      if (index) {
        if (hasWildcard(index.valueUnquoted)) {
          messages.push(
            getMessageFromId({
              messageId: 'wildcardNotSupportedForCommand',
              values: { command: 'ENRICH', value: index.valueUnquoted },
              locations: index.location,
            })
          );
        } else if (!policies.has(index.valueUnquoted)) {
          messages.push(
            getMessageFromId({
              messageId: 'unknownPolicy',
              values: { name: index.valueUnquoted },
              locations: index.location,
            })
          );
        }
      }

      if (cluster) {
        const acceptedModes = new Set<string>(
          ENRICH_MODES.map(({ name }) => '_' + name.toLowerCase())
        );
        const isValidMode = acceptedModes.has(cluster.valueUnquoted.toLowerCase());

        if (!isValidMode) {
          messages.push(
            getMessageFromId({
              messageId: 'unsupportedMode',
              values: {
                command: 'ENRICH',
                value: cluster.valueUnquoted,
                expected: [...acceptedModes].join(', '),
              },
              locations: cluster.location,
            })
          );
        }
      }

      return messages;
    },
  },
  {
    name: 'hidden_command',
    description: 'A test fixture to test hidden-ness',
    declaration: '',
    hidden: true,
    examples: [],
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
    preview: false,
    examples: [
      '… | LOOKUP JOIN lookup_index ON join_field',
      // TODO: Uncomment when other join types are implemented
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index ON index.field = index2.field',
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index AS alias ON index.field = index2.field',
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index AS alias ON index.field = index2.field, index.field2 = index2.field2',
    ],
    suggest: suggestForJoin,
  },
  {
    hidden: false,
    name: 'change_point',
    preview: true,
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.changePointDoc',
      {
        defaultMessage: 'Detect change point in the query results',
      }
    ),
    declaration: `CHANGE_POINT <value> ON <field_name> AS <type>, <pvalue>`,
    examples: [
      '… | CHANGE_POINT value',
      '… | CHANGE_POINT value ON timestamp',
      '… | CHANGE_POINT value ON timestamp AS type, pvalue',
    ],
    validate: (command: ESQLCommand, references) => {
      const messages: ESQLMessage[] = [];

      // validate change point value column
      const valueArg = command.args[0];
      if (isColumnItem(valueArg)) {
        const columnName = valueArg.name;
        // look up for columns in userDefinedColumns and existing fields
        let valueColumnType: string | undefined;
        const userDefinedColumnRef = references.userDefinedColumns.get(columnName);
        if (userDefinedColumnRef) {
          valueColumnType = userDefinedColumnRef.find((v) => v.name === columnName)?.type;
        } else {
          const fieldRef = references.fields.get(columnName);
          valueColumnType = fieldRef?.type;
        }

        if (valueColumnType && !isNumericType(valueColumnType)) {
          messages.push({
            location: command.location,
            text: i18n.translate(
              'kbn-esql-validation-autocomplete.esql.validation.changePointUnsupportedFieldType',
              {
                defaultMessage:
                  'CHANGE_POINT only supports numeric types values, found [{columnName}] of type [{valueColumnType}]',
                values: { columnName, valueColumnType },
              }
            ),
            type: 'error',
            code: 'changePointUnsupportedFieldType',
          });
        }
      }

      // validate ON column
      const defaultOnColumnName = '@timestamp';
      const onColumn = command.args.find((arg) => isOptionItem(arg) && arg.name === 'on');
      const hasDefaultOnColumn = references.fields.has(defaultOnColumnName);
      if (!onColumn && !hasDefaultOnColumn) {
        messages.push({
          location: command.location,
          text: i18n.translate(
            'kbn-esql-validation-autocomplete.esql.validation.changePointOnFieldMissing',
            {
              defaultMessage: '[CHANGE_POINT] Default {defaultOnColumnName} column is missing',
              values: { defaultOnColumnName },
            }
          ),
          type: 'error',
          code: 'changePointOnFieldMissing',
        });
      }

      // validate AS
      const asArg = command.args.find((arg) => isOptionItem(arg) && arg.name === 'as');
      if (asArg && isOptionItem(asArg)) {
        // populate userDefinedColumns references to prevent the common check from failing with unknown column
        asArg.args.forEach((arg, index) => {
          if (isColumnItem(arg)) {
            references.userDefinedColumns.set(arg.name, [
              { name: arg.name, location: arg.location, type: index === 0 ? 'keyword' : 'long' },
            ]);
          }
        });
      }

      return messages;
    },
    suggest: suggestForChangePoint,
    fieldsSuggestionsAfter: fieldsSuggestionsAfterChangePoint,
  },
  {
    hidden: true,
    name: 'fork',
    preview: true,
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.forkDoc', {
      defaultMessage: 'Forks the stream.',
    }),
    declaration: `TODO`,
    examples: [],
    suggest: suggestForFork,
    validate: (command) => {
      const messages: ESQLMessage[] = [];

      if (command.args.length < 2) {
        messages.push({
          location: command.location,
          text: i18n.translate(
            'kbn-esql-validation-autocomplete.esql.validation.forkTooFewBranches',
            {
              defaultMessage: '[FORK] Must include at least two branches.',
            }
          ),
          type: 'error',
          code: 'forkTooFewBranches',
        });
      }

      return messages;
    },

    fieldsSuggestionsAfter: fieldsSuggestionsAfterFork,
  },
  {
    hidden: false,
    name: 'completion',
    preview: true,
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.completionDoc', {
      defaultMessage:
        'Send prompts to an LLM. Requires an inference endpoint set up for `completion` tasks.',
    }),
    declaration: `COMPLETION <prompt> WITH <inferenceId> (AS <targetField>)`,
    examples: [],

    suggest: suggestForCompletion,
    validate: validateCompletion,
    fieldsSuggestionsAfter: fieldsSuggestionsAfterCompletion,
  },
  {
    hidden: false,
    name: 'sample',
    preview: true,
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.sampleDoc', {
      defaultMessage:
        'Samples a percentage of the results, optionally with a seed for reproducibility.',
    }),
    declaration: `SAMPLE <percentage> [<seed>]`,
    examples: [],
    suggest: suggestForSample,
  },
  {
    hidden: true,
    preview: true,
    name: 'rrf',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.rrfDoc', {
      defaultMessage:
        'Combines multiple result sets with different scoring functions into a single result set.',
    }),
    declaration: `RRF`,
    examples: ['… FORK (LIMIT 1) (LIMIT 2) | RRF'],
    suggest: suggestForRrf,
    validate: validateRrf,
  },
];
