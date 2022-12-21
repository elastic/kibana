/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeQuotes } from './escape_kuery';

describe('Kuery escape', () => {
  test('should escape quotes', () => {
    const value = 'I said, "Hello."';
    const expected = 'I said, \\"Hello.\\"';

    expect(escapeQuotes(value)).toBe(expected);
  });

  test('should escape backslashes and quotes', () => {
    const value = 'Backslashes \\" in the middle and ends with quotes \\"';
    const expected = 'Backslashes \\\\\\" in the middle and ends with quotes \\\\\\"';

    expect(escapeQuotes(value)).toBe(expected);
  });
});
