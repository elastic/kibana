/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractCategorizeTokens } from './extract_categorize_tokens';

describe('extractCategorizeTokens()', () => {
  it('should extract the keywords correctly', () => {
    const regexString =
      '.*?GET.+?HTTP/1.1.+?Mozilla/5.0.+?X11.+?Linux.+?i686.+?AppleWebKit/534.24.+?KHTML.+?like.+?Gecko.+?Chrome/11.0.696.50.+?Safari/534.24.*?';
    expect(extractCategorizeTokens(regexString)).toStrictEqual([
      'GET',
      'HTTP/1.1',
      'Mozilla/5.0',
      'X11',
      'Linux',
      'i686',
      'AppleWebKit/534.24',
      'KHTML',
      'like',
      'Gecko',
      'Chrome/11.0.696.50',
      'Safari/534.24',
    ]);

    const regexString2 =
      '.*?GET.+?HTTP/1.1.+?Mozilla/4.0.+?compatible.+?MSIE.+?Windows.+?NT.+?SV1.+?NET.+?CLR.*?';
    expect(extractCategorizeTokens(regexString2)).toStrictEqual([
      'GET',
      'HTTP/1.1',
      'Mozilla/4.0',
      'compatible',
      'MSIE',
      'Windows',
      'NT',
      'SV1',
      'NET',
      'CLR',
    ]);
    const regexString3 = 'GET.+?HTTP/1.1'; // No leading/trailing '.*?'
    expect(extractCategorizeTokens(regexString3)).toStrictEqual(['GET', 'HTTP/1.1']);
    const regexString4 = '.*?someString.*?'; // Just leading/trailing '.*?'
    expect(extractCategorizeTokens(regexString4)).toStrictEqual(['someString']);
    const regexString5 = 'justAString'; // No '.*?' or '.+?'
    expect(extractCategorizeTokens(regexString5)).toStrictEqual(['justAString']);
    expect(extractCategorizeTokens('.*?foo\\.bar.*?')).toEqual(['foo.bar']);
  });
});
