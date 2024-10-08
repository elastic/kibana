/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encodeUriQuery, encodeQuery, addQueryParam } from './encode_uri_query';

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

describe('addQueryParam', () => {
  const sampleParams = '?myNumber=23&myString=test&myValue=&myBoolean=false';

  describe('setting values', () => {
    it('should perserve other values', () => {
      expect(addQueryParam(sampleParams, 'myNewValue', 'test')).toEqual(
        'myBoolean=false&myNumber=23&myString=test&myValue=&myNewValue=test'
      );
    });

    it('should set boolean values', () => {
      expect(addQueryParam('', 'myBoolean', 'false')).toEqual('myBoolean=false');
      expect(addQueryParam('', 'myBoolean', 'true')).toEqual('myBoolean=true');
    });

    it('should set string values', () => {
      expect(addQueryParam('', 'myString', 'test')).toEqual('myString=test');
      expect(addQueryParam('', 'myString', '')).toEqual('myString=');
    });

    it('should set number values', () => {
      expect(addQueryParam('', 'myNumber', '23')).toEqual('myNumber=23');
      expect(addQueryParam('', 'myNumber', '0')).toEqual('myNumber=0');
    });
  });

  describe('changing values', () => {
    it('should perserve other values', () => {
      expect(addQueryParam(sampleParams, 'myBoolean', 'true')).toEqual(
        'myBoolean=true&myNumber=23&myString=test&myValue='
      );
    });

    it('should change boolean value', () => {
      expect(addQueryParam('?myBoolean=true', 'myBoolean', 'false')).toEqual('myBoolean=false');
      expect(addQueryParam('?myBoolean=false', 'myBoolean', 'true')).toEqual('myBoolean=true');
    });

    it('should change string values', () => {
      expect(addQueryParam('?myString=initial', 'myString', 'test')).toEqual('myString=test');
      expect(addQueryParam('?myString=initial', 'myString', '')).toEqual('myString=');
    });

    it('should change number values', () => {
      expect(addQueryParam('?myNumber=1', 'myNumber', '23')).toEqual('myNumber=23');
      expect(addQueryParam('?myNumber=1', 'myNumber', '0')).toEqual('myNumber=0');
    });
  });

  describe('deleting values', () => {
    it('should perserve other values', () => {
      expect(addQueryParam(sampleParams, 'myNumber')).toEqual(
        'myBoolean=false&myString=test&myValue='
      );
    });

    it('should delete empty values', () => {
      expect(addQueryParam('?myValue=', 'myValue')).toEqual('');
    });

    it('should delete boolean values', () => {
      expect(addQueryParam('?myBoolean=false', 'myBoolean')).toEqual('');
      expect(addQueryParam('?myBoolean=true', 'myBoolean')).toEqual('');
    });

    it('should delete string values', () => {
      expect(addQueryParam('?myString=test', 'myString')).toEqual('');
    });

    it('should delete number values', () => {
      expect(addQueryParam('?myNumber=23', 'myNumber')).toEqual('');
    });
  });
});
