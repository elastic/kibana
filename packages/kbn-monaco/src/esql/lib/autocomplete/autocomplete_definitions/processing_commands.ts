/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { buildDocumentation } from './utils';

import type { AutocompleteCommandDefinition, RawSignatureDefinition } from '../types';

export const pipeDefinition: AutocompleteCommandDefinition = {
  label: '|',
  insertText: '|',
  kind: 1,
  detail: i18n.translate('monaco.esql.autocomplete.pipeDoc', {
    defaultMessage: 'Pipe (|)',
  }),
  sortText: 'B',
};

export const processingRawCommandsDefinition: RawSignatureDefinition[] = [
  {
    label: 'stats',
    insertText: 'stats',
    detail: i18n.translate('monaco.esql.autocomplete.statsDoc', {
      defaultMessage:
        'Calculates aggregate statistics, such as average, count, and sum, over the incoming search results set. Similar to SQL aggregation, if the stats command is used without a BY clause, only one row is returned, which is the aggregation over the entire incoming search results set. When you use a BY clause, one row is returned for each distinct value in the field specified in the BY clause. The stats command returns only the fields in the aggregation, and you can use a wide range of statistical functions with the stats command. When you perform more than one aggregation, separate each aggregation with a comma.',
    }),
    signature:
      'stats aggs = fieldSpecification ( `,` fieldSpecification )* ( `by` groups = identifier ( `,` identifier )* )?',
    examples: ['… | stats sum(b) by b)', '… | stats avg = avg(a)'],
  },
  {
    label: 'limit',
    insertText: 'limit',
    detail: i18n.translate('monaco.esql.autocomplete.limitDoc', {
      defaultMessage:
        'Returns the first search results, in search order, based on the "limit" specified.',
    }),
    signature: 'limit size = integerLiteral',
    examples: ['… | limit 100', '… | limit 0'],
  },
  {
    label: 'eval',
    insertText: 'eval',
    detail: i18n.translate('monaco.esql.autocomplete.evalDoc', {
      defaultMessage:
        'Calculates an expression and puts the resulting value into a search results field.',
    }),
    signature: 'eval columns = fieldSpecification ( `,` fieldSpecification )*',
    examples: ['… | eval a = b * c'],
  },
  {
    label: 'keep',
    insertText: 'keep',
    detail: i18n.translate('monaco.esql.autocomplete.keepDoc', {
      defaultMessage: 'Rearranges fields in the input table by applying the keep clauses in fields',
    }),
    signature: 'keep fieldSpecification `,` fieldSpecification *',
    examples: ['… | keep a,b'],
  },
  {
    label: 'rename',
    insertText: 'rename',
    detail: i18n.translate('monaco.esql.autocomplete.renameDoc', {
      defaultMessage: 'Renames an old column to a new one',
    }),
    signature: 'rename new = old',
    examples: ['… | rename a = b'],
  },
  {
    label: 'drop',
    insertText: 'drop',
    detail: i18n.translate('monaco.esql.autocomplete.dropDoc', {
      defaultMessage: 'Drops columns',
    }),
    signature: 'drop fieldSpecification `,` fieldSpecification *',
    examples: ['… | drop a,b'],
  },
  {
    label: 'sort',
    insertText: 'sort',
    detail: i18n.translate('monaco.esql.autocomplete.sortDoc', {
      defaultMessage:
        'Sorts all results by the specified fields. When in descending order, the results missing a field are considered the smallest possible value of the field, or the largest possible value of the field when in ascending order.',
    }),
    signature: 'sort orders = orderExpression ( `,` orderExpression )*',
    examples: [
      '… | sort a  desc, b nulls last, c asc nulls first',
      '… | sort b nulls last`',
      '… | sort c asc nulls first`',
    ],
  },
  {
    label: 'where',
    insertText: 'where',
    detail: i18n.translate('monaco.esql.autocomplete.whereDoc', {
      defaultMessage:
        'Uses "predicate-expressions" to filter search results. A predicate expression, when evaluated, returns TRUE or FALSE. The where command only returns the results that evaluate to TRUE. For example, to filter results for a specific field value',
    }),
    signature: 'where condition = expression',
    examples: ['… | where status_code == 200'],
  },
  {
    label: 'dissect',
    insertText: 'dissect',
    detail: i18n.translate('monaco.esql.autocomplete.dissectDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    signature: 'dissect <inputExpression> <pattern-string> (append_separator=<string>)?',
    examples: ['… | dissect a "%{b} %{c}";'],
  },
  {
    label: 'grok',
    insertText: 'grok',
    detail: i18n.translate('monaco.esql.autocomplete.grokDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    signature: 'grok <inputExpression> <pattern-string>',
    examples: ['… | grok a "%{b} %{c}";'],
  },
  {
    label: 'mv_expand',
    insertText: 'mv_expand',
    detail: i18n.translate('monaco.esql.autocomplete.mvExpandDoc', {
      defaultMessage: 'Expands multivalued fields into one row per value, duplicating other fields',
    }),
    signature: 'mv_expand field',
    examples: ['ROW a=[1,2,3], b="b", j=["a","b"] | MV_EXPAND a'],
  },
  {
    label: 'enrich',
    insertText: 'enrich',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.enrichDoc', {
      defaultMessage: 'Enrich table with another table',
    }),
    documentation: {
      value: buildDocumentation('enrich policy', ['... | ENRICH a']),
    },
    sortText: 'B',
  },
];

export const processingCommandsDefinitions: AutocompleteCommandDefinition[] =
  processingRawCommandsDefinition.map(({ signature, examples, ...rest }) => ({
    ...rest,
    kind: 1,
    documentation: { value: buildDocumentation(signature, examples) },
  }));
