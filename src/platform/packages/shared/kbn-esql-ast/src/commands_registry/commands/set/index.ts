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

const setCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
};

export const setCommand = {
  name: 'set',
  methods: setCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-ast.esql.definitions.setDoc', {
      defaultMessage: 'Sets a query setting',
    }),
    declaration: `SET <setting> = <value>`,
    examples: [
      'SET project_routing = "_alias:_origin";',
      'SET project_routing = "_alias: *";',
      'SET project_routing = "_alias:* AND NOT _alias:_origin";',
    ],
    hidden: process.env.NODE_ENV === 'test' ? false : true, // Temporary until making it GA
    preview: true,
    name: 'set',
  },
};
