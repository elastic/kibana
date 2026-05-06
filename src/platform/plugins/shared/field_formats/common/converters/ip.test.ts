/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IpFormat } from './ip';
import { HTML_CONTEXT_TYPE, TEXT_CONTEXT_TYPE } from '../content_types';
import { expectReactElementWithNull, expectReactElementAsArray } from '../test_utils';

describe('IP Address Format', () => {
  let ip: IpFormat;

  beforeEach(() => {
    ip = new IpFormat({}, jest.fn());
  });

  test('converts a value from a decimal to a string', () => {
    expect(ip.convert(1186489492, TEXT_CONTEXT_TYPE)).toBe('70.184.100.148');
    expect(ip.convert(1186489492, HTML_CONTEXT_TYPE)).toBe('70.184.100.148');
    expect(ip.reactConvert(1186489492)).toBe('70.184.100.148');
  });

  test('missing value', () => {
    expect(ip.convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(ip.convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(ip.convert(null, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
    expect(ip.convert(undefined, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
    expectReactElementWithNull(ip.reactConvert(null));
    expectReactElementWithNull(ip.reactConvert(undefined));
  });

  test('escapes HTML characters in html context via fallback', () => {
    expect(ip.convert('<script>alert("test")</script>', HTML_CONTEXT_TYPE)).toBe(
      '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;'
    );
    expect(ip.reactConvert('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
  });

  test('wraps a multi-value array with bracket notation', () => {
    expect(ip.convert([1186489492, 16777343], TEXT_CONTEXT_TYPE)).toBe(
      '["70.184.100.148","1.0.0.127"]'
    );
    expect(ip.convert([1186489492, 16777343], HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffArray__highlight">[</span>70.184.100.148<span class="ffArray__highlight">,</span> 1.0.0.127<span class="ffArray__highlight">]</span>'
    );
    expectReactElementAsArray(ip.reactConvert([1186489492, 16777343]), [
      '70.184.100.148',
      '1.0.0.127',
    ]);
  });

  test('returns the single element without brackets for a one-element array', () => {
    expect(ip.convert([1186489492], TEXT_CONTEXT_TYPE)).toBe('["70.184.100.148"]');
    expect(ip.convert([1186489492], HTML_CONTEXT_TYPE)).toBe('70.184.100.148');
    expect(ip.reactConvert([1186489492])).toBe('70.184.100.148');
  });
});
