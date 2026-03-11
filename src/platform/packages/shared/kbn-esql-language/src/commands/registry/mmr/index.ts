/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ICommand, ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
import { Commands } from '../../definitions/keywords';
import { autocomplete } from './autocomplete';
import { validate } from './validate';

const mmrCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
};

export const mmrCommand: ICommand = {
  name: Commands.MMR,
  methods: mmrCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-language.esql.definitions.mmrDoc', {
      defaultMessage:
        'The MMR command performs Maximal Marginal Relevance (MMR) to diversify results by removing close duplicates from the result set, while maintaining the accuracy of the result set.',
    }),
    declaration: 'MMR [<<query vector>>] ON <<field>> LIMIT <limit> [WITH {<<options>>}]',
    examples: [
      'FROM test | EVAL dense_embedding=[0.5, 0.4, 0.3, 0.2]::dense_vector | LIMIT 10 | MMR ON dense_embedding LIMIT 10',
      'FROM movies | LIMIT 10 | MMR [0.5, 0.4, 0.3, 0.2]::dense_vector ON genre LIMIT 10 WITH { "lambda": 0.7 }',
    ],
    preview: true,
  },
};
