/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ICommandMethods } from '../registry';
import { autocomplete } from './autocomplete';
import { columnsAfter } from './columns_after';
import type { ICommandContext } from '../types';

const promqlCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  columnsAfter,
};

export const promqlCommand = {
  name: 'promql',
  methods: promqlCommandMethods,
  metadata: {
    type: 'source' as const,
    hidden: process.env.NODE_ENV === 'test' ? false : true, // TODO: Temporary until making it GA
    preview: true,
    description: i18n.translate('kbn-esql-language.esql.definitions.promqlDoc', {
      defaultMessage:
        'Execute PromQL queries against time series data. Requires step=, start=, end= for range queries. The index= parameter defaults to * if not specified.',
    }),
    declaration:
      'PROMQL step=<duration> start=<time> end=<time> [index=<pattern>] [column=](<query>)',
    examples: [
      'PROMQL index=metrics step=1m start=?_tstart end=?_tend (sum by (instance) (bytes))',
    ],
  },
};
