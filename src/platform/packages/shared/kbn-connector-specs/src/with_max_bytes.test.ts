/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { inputMaxBytesRegistry, PLATFORM_MAX_BYTES, withMaxBytes } from './with_max_bytes';

describe('withMaxBytes', () => {
  const value = { message: 'hello' };
  const valueBytes = JSON.stringify(value).length;

  it('accepts a value at exactly the limit', () => {
    expect(withMaxBytes(z.unknown(), valueBytes).safeParse(value).success).toBe(true);
  });

  it('rejects a value over the limit', () => {
    const result = withMaxBytes(z.unknown(), valueBytes - 1).safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      `Must be JSON-serializable and at most ${valueBytes - 1} bytes once serialized`
    );
  });

  it('measures multi-byte characters in bytes', () => {
    const multiByte = { message: 'ééé' };
    const characters = JSON.stringify(multiByte).length;
    expect(withMaxBytes(z.unknown(), characters).safeParse(multiByte).success).toBe(false);
    expect(withMaxBytes(z.unknown(), characters + 3).safeParse(multiByte).success).toBe(true);
  });

  it('rejects values that cannot be serialized', () => {
    expect(withMaxBytes(z.unknown(), 1024).safeParse({ id: BigInt(1) }).success).toBe(false);
  });

  it('records the vendor limit, or the platform limit when none is given', () => {
    expect(inputMaxBytesRegistry.get(withMaxBytes(z.unknown(), 10))).toEqual({ maxBytes: 10 });
    expect(inputMaxBytesRegistry.get(withMaxBytes(z.unknown()))).toEqual({
      maxBytes: PLATFORM_MAX_BYTES,
    });
  });

  it('keeps the limit out of the JSON Schema', () => {
    expect(z.toJSONSchema(withMaxBytes(z.unknown(), 10).describe('payload'))).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      description: 'payload',
    });
  });
});
