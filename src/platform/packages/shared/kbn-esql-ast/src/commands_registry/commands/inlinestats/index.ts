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

const inlineStatsCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
};

export const inlineStatsCommand = {
  name: 'inlinestats',
  methods: inlineStatsCommandMethods,
  metadata: {
    hidden: true,
    description: i18n.translate('kbn-esql-ast.esql.definitions.inlineStatsDoc', {
      defaultMessage:
        'Calculates an aggregate result and merges that result back into the stream of input data. Without the optional `BY` clause this will produce a single result which is appended to each row. With a `BY` clause this will produce one result per grouping and merge the result into the stream based on matching group keys.',
    }),
    declaration: '',
    examples: ['… | EVAL bar = a * b | INLINESTATS m = MAX(bar) BY b'],
  },
};
