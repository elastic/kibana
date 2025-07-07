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
import { validate } from './validate';
import type { ICommandContext } from '../../types';

const rrfCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
};

export const rrfCommand = {
  name: 'rrf',
  methods: rrfCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-ast.esql.definitions.rrfDoc', {
      defaultMessage:
        'Combines multiple result sets with different scoring functions into a single result set.',
    }),
    declaration: `RRF`,
    examples: ['… FORK (LIMIT 1) (LIMIT 2) | RRF'],
    hidden: true,
    preview: true,
    name: 'rrf',
  },
};
