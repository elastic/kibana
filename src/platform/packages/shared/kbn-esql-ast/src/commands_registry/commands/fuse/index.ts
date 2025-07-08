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

const fuseCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
};

export const fuseCommand = {
  name: 'fuse',
  methods: fuseCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-ast.esql.definitions.fuseDoc', {
      defaultMessage:
        'Combines multiple result sets with different scoring functions into a single result set.',
    }),
    declaration: `FUSE`,
    examples: ['… FORK (LIMIT 1) (LIMIT 2) | FUSE'],
    hidden: true,
    preview: true,
    name: 'fuse',
  },
};
