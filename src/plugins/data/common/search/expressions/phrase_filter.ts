/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { buildFilter, FILTERS } from '@kbn/es-query';
import { KibanaField, KibanaFilter } from './kibana_context_type';
import { IndexPattern } from '../..';

interface Arguments {
  field: KibanaField;
  phrase: string[];
  negate?: boolean;
}

export type ExpressionFunctionPhraseFilter = ExpressionFunctionDefinition<
  'rangeFilter',
  null,
  Arguments,
  KibanaFilter
>;

export const phraseFilterFunction: ExpressionFunctionPhraseFilter = {
  name: 'rangeFilter',
  type: 'kibana_filter',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.phraseFilter.help', {
    defaultMessage: 'Create kibana phrase or phrases filter',
  }),
  args: {
    field: {
      types: ['kibana_field'],
      required: true,
      help: i18n.translate('data.search.functions.phraseFilter.field.help', {
        defaultMessage: 'Specify the field you want to filter on. Use `field` function.',
      }),
    },
    phrase: {
      types: ['string'],
      multi: true,
      required: true,
      help: i18n.translate('data.search.functions.phraseFilter.phrase.help', {
        defaultMessage: 'Specify the phrases',
      }),
    },
    negate: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('data.search.functions.phraseFilter.negate.help', {
        defaultMessage: 'Should the filter be negated',
      }),
    },
  },

  fn(input, args) {
    if (args.phrase.length === 1) {
      return {
        type: 'kibana_filter',
        ...buildFilter(
          {} as any as IndexPattern,
          args.field.spec,
          FILTERS.PHRASE,
          args.negate || false,
          false,
          args.phrase[0],
          null
        ),
      };
    }

    return {
      type: 'kibana_filter',
      ...buildFilter(
        {} as any as IndexPattern,
        args.field.spec,
        FILTERS.PHRASES,
        args.negate || false,
        false,
        args.phrase,
        null
      ),
    };
  },
};
