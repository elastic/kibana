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

const enrichCommandMethods: ICommandMethods<ICommandContext> = {
  validate,
  autocomplete,
};

export const enrichCommand = {
  name: 'enrich',
  methods: enrichCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-ast.esql.definitions.enrichDoc', {
      defaultMessage:
        'Enrich table with another table. Before you can use enrich, you need to create and execute an enrich policy.',
    }),
    declaration:
      'ENRICH policy [ON match_field] [WITH [new_name1 = ]field1, [new_name2 = ]field2, ...]',
    examples: [
      '… | ENRICH my-policy',
      '… | ENRICH my-policy ON pivotField',
      '… | ENRICH my-policy ON pivotField WITH a = enrichFieldA, b = enrichFieldB',
    ],
  },
};
