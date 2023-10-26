/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
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
  },
  {
    name: 'from',
    description: i18n.translate('monaco.esql.definitions.fromDoc', {
      defaultMessage:
        'Retrieves data from one or more datasets. A dataset is a collection of data that you want to search. The only supported dataset is an index. In a query or subquery, you must use the from command first and it does not need a leading pipe. For example, to retrieve data from an index:',
    }),
    examples: ['from logs', 'from logs-*', 'from logs_*, events-*', 'from from remote*:logs*'],
    options: [metadataOption],
    signature: {
      multipleParams: true,
      params: [{ name: 'index', type: 'source' }],
    },
  },
  {
    name: 'show',
    description: i18n.translate('monaco.esql.definitions.showDoc', {
      defaultMessage: 'Returns information about the deployment and its capabilities',
    }),
    examples: ['show functions', 'show info'],
    options: [],
    signature: {
      multipleParams: false,
      params: [{ name: 'functions', type: 'string', values: ['functions', 'info'] }],
    },
  },
  {
    name: 'stats',
    description: i18n.translate('monaco.esql.definitions.statsDoc', {
      defaultMessage:
        'Calculates aggregate statistics, such as average, count, and sum, over the incoming search results set. Similar to SQL aggregation, if the stats command is used without a BY clause, only one row is returned, which is the aggregation over the entire incoming search results set. When you use a BY clause, one row is returned for each distinct value in the field specified in the BY clause. The stats command returns only the fields in the aggregation, and you can use a wide range of statistical functions with the stats command. When you perform more than one aggregation, separate each aggregation with a comma.',
    }),
    examples: ['… | stats avg = avg(a)', '… | stats sum(b) by b'],
    signature: {
      multipleParams: true,
      params: [{ name: 'expression', type: 'function' }],
    },
    options: [byOption],
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
  },
  {
    name: 'rename',
    description: i18n.translate('monaco.esql.definitions.renameDoc', {
      defaultMessage: 'Renames an old column to a new one',
    }),
    examples: ['… | rename old as new', '… | rename old as new, a as b'],
    signature: {
      multipleParams: false,
      params: [{ name: 'renameClause', type: 'any' }],
    },
    options: [asOption],
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
      params: [{ name: 'size', type: 'number' }],
    },
    options: [],
  },
  {
    name: 'keep',
    description: i18n.translate('monaco.esql.definitions.keepDoc', {
      defaultMessage: 'Rearranges fields in the input table by applying the keep clauses in fields',
    }),
    examples: ['… | keep a', '… | keep a,b'],
    options: [],
    signature: {
      multipleParams: true,
      params: [{ name: 'column', type: 'column' }],
    },
  },
  {
    name: 'drop',
    description: i18n.translate('monaco.esql.definitions.dropDoc', {
      defaultMessage: 'Drops columns',
    }),
    examples: ['… | drop a', '… | drop a,b'],
    options: [],
    signature: {
      multipleParams: true,
      params: [{ name: 'column', type: 'column' }],
    },
  },
  {
    name: 'sort',
    description: i18n.translate('monaco.esql.definitions.sortDoc', {
      defaultMessage:
        'Sorts all results by the specified fields. When in descending order, the results missing a field are considered the smallest possible value of the field, or the largest possible value of the field when in ascending order.',
    }),
    examples: [
      '… | sort a desc, b nulls last, c asc nulls first',
      '… | sort b nulls last`',
      '… | sort c asc nulls first`',
    ],
    options: [],
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
      multipleParams: true,
      params: [{ name: 'expression', type: 'boolean' }],
    },
    options: [],
  },
  {
    name: 'dissect',
    description: i18n.translate('monaco.esql.definitions.dissectDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    examples: ['… | dissect a "%{b} %{c}";'],
    options: [appendSeparatorOption],
    signature: {
      multipleParams: false,
      params: [
        { name: 'column', type: 'column', innerType: 'string' },
        { name: 'pattern', type: 'string' },
      ],
    },
  },
  {
    name: 'grok',
    description: i18n.translate('monaco.esql.definitions.grokDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    examples: ['… | grok a "%{b} %{c}";'],
    options: [],
    signature: {
      multipleParams: false,
      params: [
        { name: 'column', type: 'column', innerType: 'string' },
        { name: 'pattern', type: 'string' },
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
    signature: {
      multipleParams: false,
      params: [{ name: 'column', type: 'column', innerType: 'list' }],
    },
  },
  {
    name: 'enrich',
    description: i18n.translate('monaco.esql.definitions.enrichDoc', {
      defaultMessage: 'Enrich table with another table',
    }),
    examples: [
      '… | enrich my-policy',
      '… | enrich my-policy on pivotField',
      '… | enrich my-policy on pivotField with a = enrichFieldA, b = enrichFieldB',
    ],
    options: [onOption, withOption],
    signature: {
      multipleParams: false,
      params: [{ name: 'policyName', type: 'source', innerType: 'policy' }],
    },
  },
];
