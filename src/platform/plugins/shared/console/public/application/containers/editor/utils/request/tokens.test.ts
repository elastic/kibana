/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { containsCommentToken, replaceCommentTokens } from './tokens';

describe('tokens', () => {
  it('SHOULD detect a line comment outside a string', () => {
    expect(containsCommentToken('{"field":"value"} // comment')).toBe(true);
  });

  it('SHOULD ignore comment markers inside a JSON string', () => {
    expect(containsCommentToken('{"url":"https://example.test"}')).toBe(false);
  });

  it('SHOULD preserve strings when replacing comment tokens', () => {
    expect(replaceCommentTokens('{"url":"https://example.test"} // comment')).toBe(
      '{"url":"https://example.test"}  '
    );
  });
});
