/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SourceFormat } from './source';
import { HtmlContextTypeConvert } from '../types';
import { HTML_CONTEXT_TYPE } from '../content_types';

describe('Source Format', () => {
  let convertHtml: Function;

  beforeEach(() => {
    const source = new SourceFormat({}, jest.fn());

    convertHtml = source.getConverterFor(HTML_CONTEXT_TYPE) as HtmlContextTypeConvert;
  });

  test('should render stringified object', () => {
    const hit = {
      foo: 'bar',
      number: 42,
      hello: '<h1>World</h1>',
      also: 'with "quotes" or \'single quotes\'',
    };

    expect(
      convertHtml(hit, { field: 'field', indexPattern: { formatHit: (h: string) => h }, hit })
    ).toMatchInlineSnapshot(
      `"{\\"foo\\":\\"bar\\",\\"number\\":42,\\"hello\\":\\"<h1>World</h1>\\",\\"also\\":\\"with \\\\\\"quotes\\\\\\" or 'single quotes'\\"}"`
    );
  });
});
