/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql_query_request } from './generated/schemas/es_openapi_zod.gen';

describe('ES|QL query server defaults', () => {
  /**
   * This test verifies that server-side defaults (marked with @server_default in elasticsearch-specification)
   * are NOT applied by the Zod schema.
   *
   * Background: Elasticsearch has mutually exclusive parameters `include_ccs_metadata` and `include_execution_metadata`.
   * Both have @server_default false in the spec, but if we apply these defaults client-side,
   * both parameters get sent to ES, causing a verification_exception:
   * "Both [include_execution_metadata] and [include_ccs_metadata] query parameters are set. Use only [include_execution_metadata]"
   *
   * The fix is to NOT apply server-side defaults in the generated Zod schemas.
   */
  it('should NOT have default values for include_ccs_metadata and include_execution_metadata', () => {
    // Parse an empty body (only required field is 'query')
    const input = { query: 'FROM test' };
    const result = esql_query_request.safeParse({ body: input });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // These fields should be undefined (not set) when not provided by the user
    // If they have defaults applied, they would be `false` instead of `undefined`
    expect(result.data.body?.include_ccs_metadata).toBeUndefined();
    expect(result.data.body?.include_execution_metadata).toBeUndefined();
  });

  it('should allow explicitly setting include_ccs_metadata to true', () => {
    const input = { query: 'FROM test', include_ccs_metadata: true };
    const result = esql_query_request.safeParse({ body: input });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.body?.include_ccs_metadata).toBe(true);
    expect(result.data.body?.include_execution_metadata).toBeUndefined();
  });

  it('should allow explicitly setting include_execution_metadata to true', () => {
    const input = { query: 'FROM test', include_execution_metadata: true };
    const result = esql_query_request.safeParse({ body: input });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.body?.include_ccs_metadata).toBeUndefined();
    expect(result.data.body?.include_execution_metadata).toBe(true);
  });

  it('should allow explicitly setting both to false (user choice)', () => {
    const input = {
      query: 'FROM test',
      include_ccs_metadata: false,
      include_execution_metadata: false,
    };
    const result = esql_query_request.safeParse({ body: input });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // When explicitly set by user, values should be preserved
    expect(result.data.body?.include_ccs_metadata).toBe(false);
    expect(result.data.body?.include_execution_metadata).toBe(false);
  });
});
