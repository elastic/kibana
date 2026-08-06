/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// All schemas use lazySchema() — do not use bare z.object().
// All z.string() fields must have .max(N).
// =============================================================================

/**
 * Max length for a GraphQL query/mutation document string.
 * GraphQL operations can be large (e.g. deeply nested selections or fragments),
 * but 100 000 chars is a generous cap that prevents DoS while accommodating
 * real-world use cases.
 */
const MAX_QUERY_LENGTH = 100_000;

/** Max length for an operation name. GraphQL spec limits identifiers to ~255 chars. */
const MAX_OPERATION_NAME_LENGTH = 255;

export const QueryInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(MAX_QUERY_LENGTH)
      .describe(
        'GraphQL query document string. Must be a valid GraphQL query operation. ' +
          'Example: `{ users { id name email } }` or ' +
          '`query GetUser($id: ID!) { user(id: $id) { id name } }`'
      ),
    variables: z
      .record(z.string().max(MAX_OPERATION_NAME_LENGTH), z.unknown())
      .refine((obj) => Object.keys(obj).length <= 100, {
        message: 'A maximum of 100 variables is allowed.',
      })
      .optional()
      .describe(
        'Variables to pass to the query, as a key/value map. ' +
          'Example: `{ "id": "123", "limit": 10 }`. Omit if the query has no variables.'
      ),
    operationName: z
      .string()
      .min(1)
      .max(MAX_OPERATION_NAME_LENGTH)
      .optional()
      .describe(
        'Name of the operation to execute when the query document contains multiple named operations. ' +
          'Example: `"GetUser"`. Omit for anonymous or single-operation documents.'
      ),
  })
);
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const MutationInputSchema = lazySchema(() =>
  z.object({
    mutation: z
      .string()
      .min(1)
      .max(MAX_QUERY_LENGTH)
      .describe(
        'GraphQL mutation document string. Must be a valid GraphQL mutation operation. ' +
          'Example: `mutation CreateUser($name: String!) { createUser(name: $name) { id name } }`'
      ),
    variables: z
      .record(z.string().max(MAX_OPERATION_NAME_LENGTH), z.unknown())
      .refine((obj) => Object.keys(obj).length <= 100, {
        message: 'A maximum of 100 variables is allowed.',
      })
      .optional()
      .describe(
        'Variables to pass to the mutation, as a key/value map. ' +
          'Example: `{ "name": "Alice", "email": "alice@example.com" }`. ' +
          'Omit if the mutation has no variables.'
      ),
    operationName: z
      .string()
      .min(1)
      .max(MAX_OPERATION_NAME_LENGTH)
      .optional()
      .describe(
        'Name of the operation to execute when the mutation document contains multiple named operations. ' +
          'Omit for anonymous or single-operation documents.'
      ),
  })
);
export type MutationInput = z.infer<typeof MutationInputSchema>;

export const IntrospectInputSchema = lazySchema(() =>
  z.object({
    includeBuiltins: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'If true, include built-in GraphQL scalar types (String, Int, Float, Boolean, ID) ' +
          'and introspection types (those starting with `__`) in the returned schema. ' +
          'Default false — only user-defined types are returned, which is usually more useful.'
      ),
  })
);
export type IntrospectInput = z.infer<typeof IntrospectInputSchema>;
