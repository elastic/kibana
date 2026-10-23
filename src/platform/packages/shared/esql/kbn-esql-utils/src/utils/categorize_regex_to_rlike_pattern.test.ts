/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { categorizeRegexToRLikePattern } from './categorize_regex_to_rlike_pattern';

const HTTP_PATTERN =
  '.*?GET.+?HTTP/1.1.+?Mozilla/5.0.+?X11.+?Linux.+?i686.+?AppleWebKit/534.24.+?KHTML.+?like.+?Gecko.+?Chrome/11.0.696.50.+?Safari/534.24.*?';

describe('categorizeRegexToRLikePattern', () => {
  it('maps lazy separators and escapes raw punctuation', () => {
    expect(categorizeRegexToRLikePattern('.*?Failed login for .+? from .+?')).toBe(
      '.*Failed login for .+ from .+'
    );
    expect(categorizeRegexToRLikePattern(HTTP_PATTERN)).toBe(
      '.*GET.+HTTP/1\\.1.+Mozilla/5\\.0.+X11.+Linux.+i686.+AppleWebKit/534\\.24.+KHTML.+like.+Gecko.+Chrome/11\\.0\\.696\\.50.+Safari/534\\.24.*'
    );
  });

  it('keeps an already escaped literal escaped once', () => {
    expect(categorizeRegexToRLikePattern('.*?foo\\.bar.*?')).toBe('.*foo\\.bar.*');
    expect(categorizeRegexToRLikePattern('.*?user\\(id\\) .+? 1\\.2\\.3\\.4.*?')).toBe(
      '.*user\\(id\\) .+ 1\\.2\\.3\\.4.*'
    );
  });

  it('returns undefined without separators, when empty, or with a dangling escape', () => {
    expect(categorizeRegexToRLikePattern('some random pattern')).toBeUndefined();
    expect(categorizeRegexToRLikePattern('')).toBeUndefined();
    expect(categorizeRegexToRLikePattern('.*?trailing\\')).toBeUndefined();
  });
});
