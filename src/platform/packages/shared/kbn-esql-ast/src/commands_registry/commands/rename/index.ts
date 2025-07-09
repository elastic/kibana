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
import { columnsAfter } from './columns_after';
import type { ICommandContext } from '../../types';

const renameCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  columnsAfter,
};

export const renameCommand = {
  name: 'rename',
  methods: renameCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-ast.esql.definitions.renameDoc', {
      defaultMessage: 'Renames an old column to a new one',
    }),
    declaration: 'RENAME old_name1 AS new_name1[, ..., old_nameN AS new_nameN]',
    examples: ['… | RENAME old AS new', '… | RENAME old AS new, a AS b'],
  },
};
