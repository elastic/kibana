/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { encodeUriQuery, encodeQuery } from './encode_uri_query';

describe('encodeUriQuery', () => {
  test('should correctly encode uri query and not encode chars defined as pchar set in rfc3986', () => {
    // don't encode alphanum
    expect(encodeUriQuery('asdf1234asdf')).toBe('asdf1234asdf');

    // don't encode unreserved
    expect(encodeUriQuery("-_.!~*'() -_.!~*'()")).toBe("-_.!~*'()+-_.!~*'()");

    // don't encode the rest of pchar
    expect(encodeUriQuery(':@$, :@$,')).toBe(':@$,+:@$,');

    // encode '&', ';', '=', '+', and '#'
    expect(encodeUriQuery('&;=+# &;=+#')).toBe('%26;%3D%2B%23+%26;%3D%2B%23');

    // encode ' ' as '+'
    expect(encodeUriQuery('  ')).toBe('++');

    // encode ' ' as '%20' when a flag is used
    expect(encodeUriQuery('  ', true)).toBe('%20%20');

    // do not encode `null` as '+' when flag is used
    expect(encodeUriQuery('null', true)).toBe('null');

    // do not encode `null` with no flag
    expect(encodeUriQuery('null')).toBe('null');
  });
});

describe('encodeQuery', () => {
  test('encodeQuery', () => {
    expect(
      encodeQuery({
        a: 'asdf1234asdf',
        b: "-_.!~*'() -_.!~*'()",
        c: ':@$, :@$,',
        d: "&;=+# &;=+#'",
        f: ' ',
        g: 'null',
      })
    ).toEqual({
      a: 'asdf1234asdf',
      b: "-_.!~*'()%20-_.!~*'()",
      c: ':@$,%20:@$,',
      d: "%26;%3D%2B%23%20%26;%3D%2B%23'",
      f: '%20',
      g: 'null',
    });
  });
});
