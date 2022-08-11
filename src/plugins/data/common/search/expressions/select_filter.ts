/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { KibanaContext } from './kibana_context_type';

interface Arguments {
  group: string[];
  from?: string;
  ungrouped?: boolean;
}

export type ExpressionFunctionSelectFilter = ExpressionFunctionDefinition<
  'selectFilter',
  KibanaContext,
  Arguments,
  KibanaContext
>;

export const selectFilterFunction: ExpressionFunctionSelectFilter = {
  name: 'selectFilter',
  type: 'kibana_context',
  inputTypes: ['kibana_context'],
  help: i18n.translate('data.search.functions.selectFilter.help', {
    defaultMessage: 'Selects filters from context',
  }),
  args: {
    group: {
      types: ['string'],
      aliases: ['_'],
      help: i18n.translate('data.search.functions.selectFilter.group.help', {
        defaultMessage: 'Select only filters belonging to the provided group',
      }),
      multi: true,
    },
    from: {
      types: ['string'],
      help: i18n.translate('data.search.functions.selectFilter.from.help', {
        defaultMessage: 'Select only filters owned by the provided id',
      }),
    },
    ungrouped: {
      types: ['boolean'],
      aliases: ['nogroup', 'nogroups'],
      default: false,
      help: i18n.translate('data.search.functions.selectFilter.ungrouped.help', {
        defaultMessage: 'Should filters without group be included',
      }),
    },
  },

  fn(input, { group = [], ungrouped, from }) {
    return {
      ...input,
      filters:
        input.filters?.filter(({ meta }) => {
          const isGroupMatching =
            (!group.length && !ungrouped) ||
            (meta.group && group.length && group.includes(meta.group)) ||
            (ungrouped && !meta.group);
          const isOriginMatching = !from || from === meta.controlledBy;
          return isGroupMatching && isOriginMatching;
        }) || [],
    };
  },
};
