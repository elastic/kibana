/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { validateLiquid } from './validate_liquid';

const validate = (yaml: string) => validateLiquid(yaml, parseDocument(yaml));

describe('validateLiquid', () => {
  it('returns no issues for valid Liquid syntax', () => {
    expect(validate('message: "Hello {{ name | capitalize }} world"')).toEqual([]);
  });

  it('reports a liquid issue (with line/column) for malformed Liquid', () => {
    const issues = validate('message: "Hello {{ name | unknownFilter }} world"');
    expect(issues).toHaveLength(1);
    expect(issues[0].source).toBe('liquid');
    expect(issues[0].message).toContain('unknownFilter');
    expect(issues[0].line).toBeGreaterThan(0);
    expect(issues[0].column).toBeGreaterThan(0);
  });
});
