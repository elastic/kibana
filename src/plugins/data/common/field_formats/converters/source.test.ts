/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
});
