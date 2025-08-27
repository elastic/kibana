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

const rerankCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
};

export const rerankCommand = {
  name: 'rerank',
  methods: rerankCommandMethods,
  hidden: true,
  metadata: {
    description: i18n.translate('kbn-esql-ast.esql.definitions.rerankDoc', {
      defaultMessage:
        'Uses an inference model to compute new relevance scores for documents, directly within your ES|QL queries.',
    }),
    declaration:
      'RERANK [target_field =] query_text ON field1 [, field2, ...] WITH { "inference_id": "model_id" }',
    examples: [
      'FROM movies | RERANK "star wars" ON title WITH { "inference_id": "reranker" }',
      'FROM books | RERANK rerank_score = "hobbit" ON title, description WITH { "inference_id": "my_reranker" }',
    ],
    preview: true,
  },
};
