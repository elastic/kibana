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

const evalCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
};

export const evalCommand = {
  name: 'eval',
  methods: evalCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-ast.esql.definitions.evalDoc', {
      defaultMessage:
        'Calculates an expression and puts the resulting value into a search results field.',
    }),
    declaration: 'EVAL [column1 =] value1[, ..., [columnN =] valueN]',
    examples: [
      '… | EVAL b * c',
      '… | EVAL a = b * c',
      '… | EVAL then = NOW() + 1 year + 2 weeks',
      '… | EVAL a = b * c, d = e * f',
    ],
  },
};
