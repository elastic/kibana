/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { buildDocumentation } from './utils';

import type { AutocompleteCommandDefinition } from '../types';

export const roundCommandDefinition: AutocompleteCommandDefinition = {
  label: 'round',
  insertText: 'round',
  kind: 1,
  detail: i18n.translate('monaco.esql.autocomplete.roundDoc', {
    defaultMessage:
      'Returns a number rounded to the decimal, specified by he closest integer value. The default is to round to an integer.',
  }),
  documentation: {
    value: buildDocumentation('round(grouped[T]): aggregated[T]', [
      'from index where field="value" | eval rounded = round(field)',
    ]),
  },
  sortText: 'C',
};

export const aggregationFunctionsDefinitions: AutocompleteCommandDefinition[] = [
  {
    label: 'avg',
    insertText: 'avg',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.avgDoc', {
      defaultMessage: 'Returns the average of the values in a field',
    }),
    documentation: {
      value: buildDocumentation('avg(grouped[T]): aggregated[T]', [
        'from index | stats average = avg(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'max',
    insertText: 'max',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.maxDoc', {
      defaultMessage: 'Returns the maximum value in a field.',
    }),
    documentation: {
      value: buildDocumentation('max(grouped[T]): aggregated[T]', [
        'from index | stats max = max(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'min',
    insertText: 'min',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.minDoc', {
      defaultMessage: 'Returns the minimum value in a field.',
    }),
    documentation: {
      value: buildDocumentation('min(grouped[T]): aggregated[T]', [
        'from index | stats min = min(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'sum',
    insertText: 'sum',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.sumDoc', {
      defaultMessage: 'Returns the sum of the values in a field.',
    }),
    documentation: {
      value: buildDocumentation('sum(grouped[T]): aggregated[T]', [
        'from index | stats sum = sum(field)',
      ]),
    },
    sortText: 'C',
  },
];
