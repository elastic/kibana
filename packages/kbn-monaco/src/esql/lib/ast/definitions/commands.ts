/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { isColumnItem, isSettingItem } from '../shared/helpers';
import { ESQLColumn, ESQLCommand, ESQLCommandMode, ESQLMessage } from '../types';
import { ccqMode } from './settings';
import {
  appendSeparatorOption,
  asOption,
  byOption,
  metadataOption,
  onOption,
  withOption,
} from './options';
import type { CommandDefinition } from './types';

export const commandDefinitions: CommandDefinition[] = [
  {
    name: 'row',
    description: i18n.translate('monaco.esql.definitions.rowDoc', {
      defaultMessage:
        'Produces a row with one or more columns with values that you specify. This can be useful for testing.',
    }),
    examples: ['row a=1', 'row a=1, b=2'],
    signature: {
      multipleParams: true,
      // syntax check already validates part of this
      params: [{ name: 'assignment', type: 'any' }],
    },
    options: [],
    modes: [],
  },
  {
    name: 'from',
    description: i18n.translate('monaco.esql.definitions.fromDoc', {
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
  },
  {
    name: 'show',
    description: i18n.translate('monaco.esql.definitions.showDoc', {
      defaultMessage: 'Returns information about the deployment and its capabilities',
    }),
    examples: ['show functions', 'show info'],
    options: [],
    modes: [],
    signature: {
      multipleParams: false,
      params: [{ name: 'functions', type: 'function' }],
    },
  },
  {
    name: 'stats',
    description: i18n.translate('monaco.esql.definitions.statsDoc', {
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
    validate: (command: ESQLCommand) => {
      const messages: ESQLMessage[] = [];
      if (!command.args.length) {
        messages.push({
          location: command.location,
          text: i18n.translate('monaco.esql.validation.statsNoArguments', {
            defaultMessage: 'At least one aggregation or grouping expression required in [STATS]',
          }),
          type: 'error',
          code: 'statsNoArguments',
        });
      }
      return messages;
    },
  },
  {
    name: 'eval',
    description: i18n.translate('monaco.esql.definitions.evalDoc', {
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
    description: i18n.translate('monaco.esql.definitions.renameDoc', {
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
    description: i18n.translate('monaco.esql.definitions.limitDoc', {
      defaultMessage:
        'Returns the first search results, in search order, based on the "limit" specified.',
    }),
    examples: ['… | limit 100', '… | limit 0'],
    signature: {
      multipleParams: false,
      params: [{ name: 'size', type: 'number', literalOnly: true }],
    },
    options: [],
    modes: [],
  },
  {
    name: 'keep',
    description: i18n.translate('monaco.esql.definitions.keepDoc', {
      defaultMessage: 'Rearranges fields in the input table by applying the keep clauses in fields',
    }),
    examples: ['… | keep a', '… | keep a,b'],
    options: [],
    modes: [],
    signature: {
      multipleParams: true,
      params: [{ name: 'column', type: 'column', wildcards: true }],
    },
    validate: (command: ESQLCommand) => {
      // the command name is automatically converted into KEEP by the ast_walker
      // so validate the actual text
      const messages: ESQLMessage[] = [];
      if (/^project/.test(command.text.toLowerCase())) {
        messages.push({
          location: command.location,
          text: i18n.translate('monaco.esql.validation.projectCommandDeprecated', {
            defaultMessage: 'PROJECT command is no longer supported, please use KEEP instead',
          }),
          type: 'warning',
          code: 'projectCommandDeprecated',
        });
      }
      return messages;
    },
  },
  {
    name: 'drop',
    description: i18n.translate('monaco.esql.definitions.dropDoc', {
      defaultMessage: 'Drops columns',
    }),
    examples: ['… | drop a', '… | drop a,b'],
    options: [],
    modes: [],
    signature: {
      multipleParams: true,
      params: [{ name: 'column', type: 'column', wildcards: true }],
    },
    validate: (command: ESQLCommand) => {
      const messages: ESQLMessage[] = [];
      const wildcardItems = command.args.filter((arg) => isColumnItem(arg) && arg.name === '*');
      if (wildcardItems.length) {
        messages.push(
          ...wildcardItems.map((column) => ({
            location: (column as ESQLColumn).location,
            text: i18n.translate('monaco.esql.validation.dropAllColumnsError', {
              defaultMessage: 'Removing all fields is not allowed [*]',
            }),
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
          text: i18n.translate('monaco.esql.validation.dropTimestampWarning', {
            defaultMessage: 'Drop [@timestamp] will remove all time filters to the search results',
          }),
          type: 'warning',
          code: 'dropTimestampWarning',
        });
      }
      return messages;
    },
  },
  {
    name: 'sort',
    description: i18n.translate('monaco.esql.definitions.sortDoc', {
      defaultMessage:
        'Sorts all results by the specified fields. By default, null values are treated as being larger than any other value. With an ascending sort order, null values are sorted last, and with a descending sort order, null values are sorted first. You can change that by providing NULLS FIRST or NULLS LAST',
    }),
    examples: [
      '… | sort a desc, b nulls last, c asc nulls first',
      '… | sort b nulls last',
      '… | sort c asc nulls first',
    ],
    options: [],
    modes: [],
    signature: {
      multipleParams: true,
      params: [
        { name: 'column', type: 'column' },
        { name: 'direction', type: 'string', optional: true, values: ['asc', 'desc'] },
        { name: 'nulls', type: 'string', optional: true, values: ['nulls first', 'nulls last'] },
      ],
    },
  },
  {
    name: 'where',
    description: i18n.translate('monaco.esql.definitions.whereDoc', {
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
  },
  {
    name: 'dissect',
    description: i18n.translate('monaco.esql.definitions.dissectDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    examples: ['… | dissect a "%{b} %{c}"'],
    options: [appendSeparatorOption],
    modes: [],
    signature: {
      multipleParams: false,
      params: [
        { name: 'column', type: 'column', innerType: 'string' },
        { name: 'pattern', type: 'string', literalOnly: true },
      ],
    },
  },
  {
    name: 'grok',
    description: i18n.translate('monaco.esql.definitions.grokDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    examples: ['… | grok a "%{IP:b} %{NUMBER:c}"'],
    options: [],
    modes: [],
    signature: {
      multipleParams: false,
      params: [
        { name: 'column', type: 'column', innerType: 'string' },
        { name: 'pattern', type: 'string', literalOnly: true },
      ],
    },
  },
  {
    name: 'mv_expand',
    description: i18n.translate('monaco.esql.definitions.mvExpandDoc', {
      defaultMessage: 'Expands multivalued fields into one row per value, duplicating other fields',
    }),
    examples: ['row a=[1,2,3] | mv_expand a'],
    options: [],
    modes: [],
    signature: {
      multipleParams: false,
      params: [{ name: 'column', type: 'column', innerType: 'any' }],
    },
  },
  {
    name: 'enrich',
    description: i18n.translate('monaco.esql.definitions.enrichDoc', {
      defaultMessage:
        'Enrich table with another table. Before you can use enrich, you need to create and execute an enrich policy.',
    }),
    examples: [
      '… | enrich my-policy',
      '… | enrich my-policy on pivotField',
      '… | enrich my-policy on pivotField with a = enrichFieldA, b = enrichFieldB',
    ],
    options: [onOption, withOption],
    modes: [ccqMode],
    signature: {
      multipleParams: false,
      params: [{ name: 'policyName', type: 'source', innerType: 'policy' }],
    },
    validate: (command: ESQLCommand) => {
      const messages: ESQLMessage[] = [];
      if (command.args.some(isSettingItem)) {
        const settings = command.args.filter(isSettingItem);
        const settingCounters: Record<string, number> = {};
        const settingLookup: Record<string, ESQLCommandMode> = {};
        for (const setting of settings) {
          if (!settingCounters[setting.name]) {
            settingCounters[setting.name] = 0;
            settingLookup[setting.name] = setting;
          }
          settingCounters[setting.name]++;
        }
        const duplicateSettings = Object.entries(settingCounters).filter(([_, count]) => count > 1);
        messages.push(
          ...duplicateSettings.map(([name]) => ({
            location: settingLookup[name].location,
            text: i18n.translate('monaco.esql.validation.duplicateSettingWarning', {
              defaultMessage:
                'Multiple definition of setting [{name}]. Only last one will be applied.',
              values: {
                name,
              },
            }),
            type: 'warning' as const,
            code: 'duplicateSettingWarning',
          }))
        );
      }
      return messages;
    },
  },
];
