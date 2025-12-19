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
import { validate } from './validate';

const mvExpandCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
};

export const mvExpandCommand = {
  name: 'mv_expand',
  methods: mvExpandCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-language.esql.definitions.mvExpandDoc', {
      defaultMessage: 'Expands multivalued fields into one row per value, duplicating other fields',
    }),
    declaration: 'MV_EXPAND column',
    examples: ['ROW a=[1,2,3] | MV_EXPAND a'],
    preview: true,
  },
};
