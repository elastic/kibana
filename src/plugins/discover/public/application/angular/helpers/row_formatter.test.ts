/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
