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

import { formatRow } from './row_formatter';
import { stubbedSavedObjectIndexPattern } from '../../../__mocks__/stubbed_saved_object_index_pattern';
import { IndexPattern } from '../../../../../data/common/index_patterns/index_patterns';
import { fieldFormatsMock } from '../../../../../data/common/field_formats/mocks';

describe('Row formatter', () => {
  const hit = {
    foo: 'bar',
    number: 42,
    hello: '<h1>World</h1>',
    also: 'with "quotes" or \'single quotes\'',
  };

  const createIndexPattern = () => {
    const id = 'my-index';
    const {
      type,
      version,
      attributes: { timeFieldName, fields, title },
    } = stubbedSavedObjectIndexPattern(id);

    return new IndexPattern({
      spec: { id, type, version, timeFieldName, fields, title },
      fieldFormats: fieldFormatsMock,
      shortDotsEnable: false,
      metaFields: [],
    });
  };

  const indexPattern = createIndexPattern();

  const formatHitReturnValue = {
    also: 'with \\&quot;quotes\\&quot; or &#39;single qoutes&#39;',
    number: '42',
    foo: 'bar',
    hello: '&lt;h1&gt;World&lt;/h1&gt;',
  };
  const formatHitMock = jest.fn().mockReturnValueOnce(formatHitReturnValue);

  beforeEach(() => {
    // @ts-ignore
    indexPattern.formatHit = formatHitMock;
  });

  it('formats document properly', () => {
    expect(formatRow(hit, indexPattern).trim()).toBe(
      '<dl class="source truncate-by-height"><dt>also:</dt><dd>with \\&quot;quotes\\&quot; or &#39;single qoutes&#39;</dd> <dt>number:</dt><dd>42</dd> <dt>foo:</dt><dd>bar</dd> <dt>hello:</dt><dd>&lt;h1&gt;World&lt;/h1&gt;</dd> </dl>'
    );
  });
});
