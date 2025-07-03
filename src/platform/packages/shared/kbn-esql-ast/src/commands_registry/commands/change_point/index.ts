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
import { validate } from './validate';
import type { ICommandContext } from '../../types';

const changePointCommandMethods: ICommandMethods<ICommandContext> = {
  validate,
  autocomplete,
  columnsAfter,
};

export const changePointCommand = {
  name: 'change_point',
  methods: changePointCommandMethods,
  metadata: {
    preview: true,
    description: i18n.translate('kbn-esql-ast.esql.definitions.changePointDoc', {
      defaultMessage: 'Detect change point in the query results',
    }),
    declaration: `CHANGE_POINT <value> ON <field_name> AS <type>, <pvalue>`,
    examples: [
      '… | CHANGE_POINT value',
      '… | CHANGE_POINT value ON timestamp',
      '… | CHANGE_POINT value ON timestamp AS type, pvalue',
    ],
  },
};
