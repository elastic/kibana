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
import { Commands } from '../../definitions/keywords';

const limitCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
};

export const limitCommand = {
  name: Commands.LIMIT,
  methods: limitCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-language.esql.definitions.limitDoc', {
      defaultMessage:
        'Returns the first search results, in search order, based on the "limit" specified.',
    }),
    preview: true,
    // TODO: Remove this temporary autocomplete gate once LIMIT BY is available outside tests.
    limitByHidden: process.env.NODE_ENV === 'test' ? false : true,
    declaration: 'LIMIT max_number_of_rows [BY grouping_expression1[, ..., grouping_expressionN]]',
    examples: ['… | LIMIT 100', '… | LIMIT 1', '… | LIMIT 10 BY category'],
  },
};
