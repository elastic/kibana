/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeKuery } from './escape_kuery';

describe('escapeKuery', () => {
  test('should escape special characters', () => {
    const value = `This \\ has (a lot of) <special> characters, don't you *think*? "Yes."`;
    const expected = `This \\\\ has \\(a lot of\\) \\<special\\> characters, don't you \\*think\\*? \\"Yes.\\"`;

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape keywords', () => {
    const value = 'foo and bar or baz not qux';
    const expected = 'foo \\and bar \\or baz \\not qux';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape keywords next to each other', () => {
    const value = 'foo and bar or not baz';
    const expected = 'foo \\and bar \\or \\not baz';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should not escape keywords without surrounding spaces', () => {
    const value = 'And this has keywords, or does it not?';
    const expected = 'And this has keywords, \\or does it not?';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape uppercase keywords', () => {
    const value = 'foo AND bar';
    const expected = 'foo \\AND bar';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape both keywords and special characters', () => {
    const value = 'Hello, world, and <nice> to meet you!';
    const expected = 'Hello, world, \\and \\<nice\\> to meet you!';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape newlines and tabs', () => {
    const value = 'This\nhas\tnewlines\r\nwith\ttabs';
    const expected = 'This\\nhas\\tnewlines\\r\\nwith\\ttabs';

    expect(escapeKuery(value)).toBe(expected);
  });
});
