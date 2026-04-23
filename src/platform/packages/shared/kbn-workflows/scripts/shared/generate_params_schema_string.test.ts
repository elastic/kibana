/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateParamsSchemaString, getRequestSchemaName } from './generate_params_schema_string';

describe('getRequestSchemaName', () => {
  it('should return the operation id suffixed with _request', () => {
    expect(getRequestSchemaName('search')).toBe('search_request');
  });
});

describe('generateParamsSchemaString', () => {
  it('should return optional z.object when no operation ids are provided', () => {
    const result = generateParamsSchemaString([], {});
    expect(result).toBe('z.optional(z.object({  }))');
  });

  it('should return z.object with getShapeAt spreads for a single operation id', () => {
    const result = generateParamsSchemaString(['search'], {});
    expect(result).toContain('getShapeAt(search_request,');
    expect(result).toContain("'body'");
    expect(result).toContain("'path'");
    expect(result).toContain("'query'");
  });

  it('should return z.union for multiple operation ids', () => {
    const result = generateParamsSchemaString(['search', 'indices.create'], {});
    expect(result).toContain('z.union([');
    expect(result).toContain('search_request');
    expect(result).toContain('indices_create_request');
  });

  it('should include extendParams in the output', () => {
    const result = generateParamsSchemaString(['search'], { timeout: 'z.number()' });
    expect(result).toContain('timeout: z.number()');
  });

  it('should include spreadParams in the output', () => {
    const result = generateParamsSchemaString(['search'], {}, ['metaSchema.shape']);
    expect(result).toContain('...metaSchema.shape');
  });
});
