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
import { validate } from './validate';

const whereCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
};

export const whereCommand = {
  name: 'where',
  methods: whereCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-ast.esql.definitions.whereDoc', {
      defaultMessage:
        'Uses "predicate-expressions" to filter search results. A predicate expression, when evaluated, returns TRUE or FALSE. The where command only returns the results that evaluate to TRUE. For example, to filter results for a specific field value',
    }),
    declaration: 'WHERE expression',
    examples: ['… | WHERE status_code == 200'],
  },
};
