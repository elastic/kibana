/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { formatRow, formatTopLevelObject } from './row_formatter';
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
  const formatHitMock = jest.fn().mockReturnValue(formatHitReturnValue);

  beforeEach(() => {
    // @ts-expect-error
    indexPattern.formatHit = formatHitMock;
  });

  it('formats document properly', () => {
    expect(formatRow(hit, indexPattern).trim()).toMatchInlineSnapshot(
      `"<dl class=\\"source truncate-by-height\\"><dt>also:</dt><dd>with \\\\&quot;quotes\\\\&quot; or &#39;single qoutes&#39;</dd> <dt>number:</dt><dd>42</dd> <dt>foo:</dt><dd>bar</dd> <dt>hello:</dt><dd>&lt;h1&gt;World&lt;/h1&gt;</dd> </dl>"`
    );
  });

  it('formats document with highlighted fields first', () => {
    expect(
      formatRow({ ...hit, highlight: { number: '42' } }, indexPattern).trim()
    ).toMatchInlineSnapshot(
      `"<dl class=\\"source truncate-by-height\\"><dt>number:</dt><dd>42</dd> <dt>also:</dt><dd>with \\\\&quot;quotes\\\\&quot; or &#39;single qoutes&#39;</dd> <dt>foo:</dt><dd>bar</dd> <dt>hello:</dt><dd>&lt;h1&gt;World&lt;/h1&gt;</dd> </dl>"`
    );
  });

  it('formats top level objects using formatter', () => {
    indexPattern.getFieldByName = jest.fn().mockReturnValue({
      name: 'subfield',
    });
    indexPattern.getFormatterForField = jest.fn().mockReturnValue({
      convert: () => 'formatted',
    });
    expect(
      formatTopLevelObject(
        {
          fields: {
            'object.value': [5, 10],
          },
        },
        {
          'object.value': [5, 10],
        },
        indexPattern
      ).trim()
    ).toMatchInlineSnapshot(
      `"<dl class=\\"source truncate-by-height\\"><dt>object.value:</dt><dd>formatted, formatted</dd> </dl>"`
    );
  });

  it('formats top level objects with subfields and highlights', () => {
    indexPattern.getFieldByName = jest.fn().mockReturnValue({
      name: 'subfield',
    });
    indexPattern.getFormatterForField = jest.fn().mockReturnValue({
      convert: () => 'formatted',
    });
    expect(
      formatTopLevelObject(
        {
          fields: {
            'object.value': [5, 10],
            'object.keys': ['a', 'b'],
          },
          highlight: {
            'object.keys': 'a',
          },
        },
        {
          'object.value': [5, 10],
          'object.keys': ['a', 'b'],
        },
        indexPattern
      ).trim()
    ).toMatchInlineSnapshot(
      `"<dl class=\\"source truncate-by-height\\"><dt>object.keys:</dt><dd>formatted, formatted</dd> <dt>object.value:</dt><dd>formatted, formatted</dd> </dl>"`
    );
  });

  it('formats top level objects, converting unknown fields to string', () => {
    indexPattern.getFieldByName = jest.fn();
    indexPattern.getFormatterForField = jest.fn();
    expect(
      formatTopLevelObject(
        {
          fields: {
            'object.value': [5, 10],
          },
        },
        {
          'object.value': [5, 10],
        },
        indexPattern
      ).trim()
    ).toMatchInlineSnapshot(
      `"<dl class=\\"source truncate-by-height\\"><dt>object.value:</dt><dd>5, 10</dd> </dl>"`
    );
  });
});
