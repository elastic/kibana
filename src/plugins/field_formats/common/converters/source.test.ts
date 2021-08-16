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

export const stubIndexPatternWithFields = {
  id: '1234',
  title: 'logstash-*',
  fields: [
    {
      name: 'response',
      type: 'number',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
};

describe('Source Format', () => {
  let convertHtml: Function;

  beforeEach(() => {
    const source = new SourceFormat({}, jest.fn());

    convertHtml = source.getConverterFor(HTML_CONTEXT_TYPE) as HtmlContextTypeConvert;
  });

  test('should use the text content type if a field is not passed', () => {
    const hit = {
      foo: 'bar',
      number: 42,
      hello: '<h1>World</h1>',
      also: 'with "quotes" or \'single quotes\'',
    };

    expect(convertHtml(hit)).toBe(
      '<span ng-non-bindable>{&quot;foo&quot;:&quot;bar&quot;,&quot;number&quot;:42,&quot;hello&quot;:&quot;&lt;h1&gt;World&lt;/h1&gt;&quot;,&quot;also&quot;:&quot;with \\&quot;quotes\\&quot; or &#39;single quotes&#39;&quot;}</span>'
    );
  });

  test('should render a description list if a field is passed', () => {
    const hit = {
      foo: 'bar',
      number: 42,
      hello: '<h1>World</h1>',
      also: 'with "quotes" or \'single quotes\'',
    };

    const indexPattern = { ...stubIndexPatternWithFields, formatHit: (h: string) => h };

    expect(convertHtml(hit, { field: 'field', indexPattern, hit })).toMatchInlineSnapshot(
      `"<span ng-non-bindable><dl class=\\"source truncate-by-height\\"><dt>foo:</dt><dd>bar</dd> <dt>number:</dt><dd>42</dd> <dt>hello:</dt><dd><h1>World</h1></dd> <dt>also:</dt><dd>with \\"quotes\\" or 'single quotes'</dd> </dl></span>"`
    );
  });
});
