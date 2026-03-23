/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import {
  global_search_response_body,
  global_search_types_hit,
  types_mapping_property,
} from './generated/schemas/es_openapi_zod.gen';

describe('types_mapping_property', () => {
  it('should be a valid zod schema', () => {
    expect(types_mapping_property).toBeDefined();
  });
  it('should parse a simple keyword property', () => {
    const result = types_mapping_property.safeParse({ type: 'keyword' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ type: 'keyword' });
  });
});

describe('global_search_types_hit', () => {
  it('should be a valid zod schema', () => {
    expect(global_search_types_hit).toBeDefined();
  });
  it('should have a _source property of type record of unknown', () => {
    const sourceSchema = global_search_types_hit.shape._source?.unwrap();
    expect(sourceSchema).toBeDefined();
    expect(sourceSchema).toBeInstanceOf(z.ZodRecord);
    expect(sourceSchema.valueType).toBeInstanceOf(z.ZodUnknown);
  });
});

describe('global_search_response_body', () => {
  it('should be a valid zod schema', () => {
    expect(global_search_response_body).toBeDefined();
  });
  it('should have a hits property of type array of global_search_types_hit', () => {
    const hitsSchema = global_search_response_body.shape.hits.shape.hits;
    expect(hitsSchema).toBeDefined();
    expect(hitsSchema).toBeInstanceOf(z.ZodArray);
    expect(hitsSchema.element?.unwrap()).toEqual(global_search_types_hit);
  });
});
