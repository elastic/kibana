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

const sampleCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
};

export const sampleCommand = {
  name: 'sample',
  methods: sampleCommandMethods,
  metadata: {
    preview: true,
    description: i18n.translate('kbn-esql-ast.esql.definitions.sampleDoc', {
      defaultMessage:
        'Samples a percentage of the results, optionally with a seed for reproducibility.',
    }),
    declaration: `SAMPLE <percentage>`,
    examples: [],
  },
};
