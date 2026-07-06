/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { safeParseResult } from './safe_parse_result';

describe('safeParseResult', () => {
  const schema = z.object({ name: z.string() });

  it('returns parsed data on success', () => {
    const result = safeParseResult({ name: 'test' }, schema);
    expect(result).toEqual({ name: 'test' });
  });

  it('returns undefined on failure', () => {
    const result = safeParseResult({ name: 123 }, schema);
    expect(result).toBeUndefined();
  });

  it('returns undefined for invalid input (null)', () => {
    const result = safeParseResult(null, schema);
    expect(result).toBeUndefined();
  });
});
