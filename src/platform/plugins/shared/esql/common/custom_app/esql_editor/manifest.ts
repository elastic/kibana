/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, stateKeySchema, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { MAX_HEADING_LENGTH, MAX_QUERY_LENGTH } from '@kbn/custom-app-common';

export const esqlEditorCapability = defineCapability({
  kind: 'component',
  id: 'esql_editor',
  version: 1,
  props: lazySchema(() =>
    z.object({
      title: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .optional()
        .describe('A heading above the editor. It may use {{state.key}}.'),
      query: z
        .string()
        .max(MAX_QUERY_LENGTH)
        .default('')
        .describe('The ES|QL query the editor starts with. People can change it.'),
      bind: stateKeySchema
        .optional()
        .describe(
          'A text value of the app that holds the query as it is written, so that an action can hand it to a workflow. It must be declared as a string.'
        ),
    })
  ),
  doc: {
    summary:
      'An ES|QL editor and a Run button, with a table of what the query returns, for people who write their own queries. The query runs as the person who is looking, with the period and the filters of the app, and the values of the app are offered to it as ?name. With "bind" the text is kept in a value of the app.',
    whenToUse:
      'When the people using the app should write queries themselves. For a query that the app fixes use table, chart or stat.',
    example: {
      type: 'esql_editor',
      id: 'explore',
      title: 'Explore the logs',
      query: 'FROM logs-* | LIMIT 10',
    },
  },
  interpolated: ['title'],
  bindings: (node) => (node.bind === undefined ? [] : [node.bind]),
  private: true,
  data: 'own',
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    esql_editor: CapabilityNodeOf<typeof esqlEditorCapability>;
  }
}
