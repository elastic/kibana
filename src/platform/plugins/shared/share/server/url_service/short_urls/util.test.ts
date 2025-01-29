/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeSearchReservedChars, validateSlug } from './util';

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

describe('validateSlug', () => {
  it('validates slugs that contain [a-zA-Z0-9.-_] chars', () => {
    validateSlug('asdf');
    validateSlug('asdf-asdf');
    validateSlug('asdf-asdf-333');
    validateSlug('my-custom-slug');
    validateSlug('my.slug');
    validateSlug('my_super-custom.slug');
  });

  it('throws on slugs which contain invalid characters', () => {
    expect(() => validateSlug('hello-tom&herry')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid [slug = hello-tom&herry]."`
    );
    expect(() => validateSlug('foo(bar)')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid [slug = foo(bar)]."`
    );
  });

  it('throws if slug is shorter than 3 chars', () => {
    expect(() => validateSlug('ab')).toThrowErrorMatchingInlineSnapshot(`"Invalid [slug = ab]."`);
  });

  it('throws if slug is longer than 255 chars', () => {
    expect(() =>
      validateSlug(
        'aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa'
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid [slug = aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa-aaaaaaaaaa]."`
    );
  });
});
