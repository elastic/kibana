/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeSearchReservedChars } from './util';

describe('escapeSearchReservedChars', () => {
  it('should escape search reserved chars', () => {
    expect(escapeSearchReservedChars('+')).toEqual('\\+');
    expect(escapeSearchReservedChars('-')).toEqual('\\-');
    expect(escapeSearchReservedChars('!')).toEqual('\\!');
    expect(escapeSearchReservedChars('(')).toEqual('\\(');
    expect(escapeSearchReservedChars(')')).toEqual('\\)');
    expect(escapeSearchReservedChars('*')).toEqual('\\*');
    expect(escapeSearchReservedChars('~')).toEqual('\\~');
    expect(escapeSearchReservedChars('^')).toEqual('\\^');
    expect(escapeSearchReservedChars('|')).toEqual('\\|');
    expect(escapeSearchReservedChars('[')).toEqual('\\[');
    expect(escapeSearchReservedChars(']')).toEqual('\\]');
    expect(escapeSearchReservedChars('{')).toEqual('\\{');
    expect(escapeSearchReservedChars('}')).toEqual('\\}');
    expect(escapeSearchReservedChars('"')).toEqual('\\"');
  });

  it('escapes short URL slugs', () => {
    expect(escapeSearchReservedChars('test-slug-123456789')).toEqual('test\\-slug\\-123456789');
    expect(escapeSearchReservedChars('my-dashboard-link')).toEqual('my\\-dashboard\\-link');
    expect(escapeSearchReservedChars('link-v1.0.0')).toEqual('link\\-v1.0.0');
    expect(escapeSearchReservedChars('simple_link')).toEqual('simple_link');
  });
});
