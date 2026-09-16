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
import { autocomplete } from './autocomplete';

const denseVectorCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
};

export const denseVectorCommand: ICommand = {
  // Elasticsearch ships no command definition for snapshot-only commands, so `dense_vector` is
  // absent from the generated `Commands` enum. Switch to `Commands.DENSE_VECTOR` once it lands.
  name: 'dense_vector',
  methods: denseVectorCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-language.esql.definitions.denseVectorDoc', {
      defaultMessage:
        'Generates an embedding per row for each listed text field, appending a <field>_dense_vector column.',
    }),
    declaration: 'DENSE_VECTOR field1 [, field2, ...] [WITH { <options> }]',
    examples: [
      'FROM books | DENSE_VECTOR description',
      'FROM books | DENSE_VECTOR title, description',
      'FROM books | DENSE_VECTOR description WITH { "inference_id": "my-endpoint", "timeout": "10s" }',
    ],
    preview: true,
  },
};
