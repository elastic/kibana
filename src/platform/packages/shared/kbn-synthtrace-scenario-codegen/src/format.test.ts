/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatKey, formatObject, formatValue, quote } from './format';

describe('format', () => {
  it('quotes and escapes strings', () => {
    expect(quote("it's")).toBe("'it\\'s'");
    expect(quote('a\\b')).toBe("'a\\\\b'");
  });

  it('only quotes object keys that are not valid identifiers', () => {
    expect(formatKey('serviceName')).toBe('serviceName');
    expect(formatKey('service.name')).toBe("'service.name'");
  });

  it('formats primitives, arrays and nested objects', () => {
    expect(formatValue(42)).toBe('42');
    expect(formatValue(true)).toBe('true');
    expect(formatValue(null)).toBe('null');
    expect(formatValue([1, 'a'])).toBe("[1, 'a']");
  });

  it('drops undefined entries from objects', () => {
    expect(formatObject({ a: 1, b: undefined, c: 'x' })).toBe("{ a: 1, c: 'x' }");
    expect(formatObject({})).toBe('{}');
  });
});
