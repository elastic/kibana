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

const sortCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
};

export const sortCommand = {
  name: 'sort',
  methods: sortCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-ast.esql.definitions.sortDoc', {
      defaultMessage:
        'Sorts all results by the specified fields. By default, null values are treated as being larger than any other value. With an ascending sort order, null values are sorted last, and with a descending sort order, null values are sorted first. You can change that by providing NULLS FIRST or NULLS LAST',
    }),
    declaration:
      'SORT column1 [ASC/DESC][NULLS FIRST/NULLS LAST][, ..., columnN [ASC/DESC][NULLS FIRST/NULLS LAST]]',
    examples: [
      '… | SORT a DESC, b NULLS LAST, c ASC NULLS FIRST',
      '… | SORT b NULLS LAST',
      '… | SORT c ASC NULLS FIRST',
      '… | SORT a - abs(b)',
    ],
  },
};
