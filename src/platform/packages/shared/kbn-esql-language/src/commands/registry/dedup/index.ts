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

const dedupCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
};

export const dedupCommand = {
  name: Commands.DEDUP,
  methods: dedupCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-language.esql.definitions.dedupDoc', {
      defaultMessage: "A surrogate for LIMIT 1 BY '<'all-fields'>'.",
    }),
    declaration: 'DEDUP',
    examples: ['FROM employees\n| KEEP gender\n| DEDUP\n| SORT gender NULLS LAST\n| LIMIT 2'],
  },
};
