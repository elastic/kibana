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
import { validate } from './validate';
import type { ICommandContext } from '../types';
import { columnsAfter } from './columns_after';
import { summary } from './summary';

const fromCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
  columnsAfter,
  summary,
};

export const fromCommand = {
  name: 'from',
  methods: fromCommandMethods,
  metadata: {
    type: 'source' as const,
    subquerySupport: process.env.NODE_ENV === 'test' ? true : false, // Temporary until making it Preview
    viewsSupport: process.env.NODE_ENV === 'test' ? true : false, // Temporary until making it Preview
    description: i18n.translate('kbn-esql-language.esql.definitions.fromDoc', {
      defaultMessage:
        'Retrieves data from one or more data streams, indices, or aliases. In a query or subquery, you must use the from command first and it does not need a leading pipe. For example, to retrieve data from an index:',
    }),
    declaration: 'FROM index_pattern [METADATA fields]',
    examples: ['FROM logs', 'FROM logs-*', 'FROM logs_*, events-*'],
  },
};
