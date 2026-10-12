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
import type { ICommandContext } from '../types';
import { columnsAfter } from './columns_after';
import { summary } from './summary';

const showCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  columnsAfter,
  summary,
};

export const showCommand = {
  name: 'show',
  methods: showCommandMethods,
  metadata: {
    type: 'source' as const,
    description: i18n.translate('kbn-esql-language.esql.definitions.showDoc', {
      defaultMessage: 'Returns information about the deployment and its capabilities',
    }),
    declaration: 'SHOW item',
    examples: ['SHOW INFO'],
  },
};
