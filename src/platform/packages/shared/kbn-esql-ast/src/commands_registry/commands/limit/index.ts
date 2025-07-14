/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ICommandMethods } from '../../registry';
import { autocomplete } from './autocomplete';
import type { ICommandContext } from '../../types';

const limitCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
};

export const limitCommand = {
  name: 'limit',
  methods: limitCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-ast.esql.definitions.limitDoc', {
      defaultMessage:
        'Returns the first search results, in search order, based on the "limit" specified.',
    }),
    declaration: 'LIMIT max_number_of_rows',
    examples: ['… | LIMIT 100', '… | LIMIT 1'],
  },
};
