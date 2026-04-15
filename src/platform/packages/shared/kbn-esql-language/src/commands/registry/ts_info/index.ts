/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ICommand, ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
import { Commands } from '../../definitions/keywords';
import { columnsAfter } from './columns_after';
import { summary } from './summary';

const tsInfoCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete: () => Promise.resolve([]),
  columnsAfter,
  summary,
};

export const tsInfoCommand: ICommand = {
  name: Commands.TS_INFO,
  methods: tsInfoCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-language.esql.definitions.tsInfoDoc', {
      defaultMessage:
        'The TS_INFO command returns information about the time series metrics in the query. Only available on TS source commands.',
    }),
    declaration: 'TS_INFO',
    examples: ['TS index | TS_INFO'],
    preview: true,
    requiresTimeseriesSource: true,
    hiddenAfterCommands: [Commands.STATS, Commands.INLINE_STATS],
  },
};
