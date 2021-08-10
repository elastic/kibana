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
import { fieldFormatsMock } from '../../../../../field_formats/common/mocks';
import { setServices } from '../../../kibana_services';
import { DiscoverServices } from '../../../build_services';

describe('Row formatter', () => {
  const hit = {
    _id: 'a',
    _type: 'doc',
    _score: 1,
    _source: {
      foo: 'bar',
      number: 42,
      hello: '<h1>World</h1>',
      also: 'with "quotes" or \'single quotes\'',
    },
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

  // Realistic response with alphabetical insertion order
  const formatHitReturnValue = {
    also: 'with \\&quot;quotes\\&quot; or &#39;single qoutes&#39;',
    foo: 'bar',
    number: '42',
    hello: '&lt;h1&gt;World&lt;/h1&gt;',
    _id: 'a',
    _type: 'doc',
    _score: 1,
  };

  const formatHitMock = jest.fn().mockReturnValue(formatHitReturnValue);

  beforeEach(() => {
    // @ts-expect-error
    indexPattern.formatHit = formatHitMock;
    setServices(({
      uiSettings: {
        get: () => 100,
      },
    } as unknown) as DiscoverServices);
  });

  it('formats document properly', () => {
    expect(formatRow(hit, indexPattern).trim()).toMatchInlineSnapshot(
      `"<dl class=\\"source truncate-by-height\\"><dt>also:</dt><dd>with \\\\&quot;quotes\\\\&quot; or &#39;single qoutes&#39;</dd> <dt>foo:</dt><dd>bar</dd> <dt>number:</dt><dd>42</dd> <dt>hello:</dt><dd>&lt;h1&gt;World&lt;/h1&gt;</dd> <dt>_id:</dt><dd>a</dd> <dt>_type:</dt><dd>doc</dd> <dt>_score:</dt><dd>1</dd> </dl>"`
    );
  });

  it('limits number of rendered items', () => {
    setServices(({
      uiSettings: {
        get: () => 1,
      },
    } as unknown) as DiscoverServices);
    expect(formatRow(hit, indexPattern).trim()).toMatchInlineSnapshot(
      `"<dl class=\\"source truncate-by-height\\"><dt>also:</dt><dd>with \\\\&quot;quotes\\\\&quot; or &#39;single qoutes&#39;</dd> </dl>"`
    );
  });

  it('formats document with highlighted fields first', () => {
    expect(
      formatRow({ ...hit, highlight: { number: '42' } }, indexPattern).trim()
    ).toMatchInlineSnapshot(
      `"<dl class=\\"source truncate-by-height\\"><dt>number:</dt><dd>42</dd> <dt>also:</dt><dd>with \\\\&quot;quotes\\\\&quot; or &#39;single qoutes&#39;</dd> <dt>foo:</dt><dd>bar</dd> <dt>hello:</dt><dd>&lt;h1&gt;World&lt;/h1&gt;</dd> <dt>_id:</dt><dd>a</dd> <dt>_type:</dt><dd>doc</dd> <dt>_score:</dt><dd>1</dd> </dl>"`
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
          getByName: jest.fn(),
        },
        indexPattern
      ).trim()
    ).toMatchInlineSnapshot(
      `"<dl class=\\"source truncate-by-height\\"><dt>object.value:</dt><dd>formatted, formatted</dd> </dl>"`
    );
  });

  it('formats top level objects in alphabetical order', () => {
    indexPattern.getFieldByName = jest.fn().mockReturnValue({
      name: 'subfield',
    });
    indexPattern.getFormatterForField = jest.fn().mockReturnValue({
      convert: () => 'formatted',
    });
    const formatted = formatTopLevelObject(
      { fields: { 'a.zzz': [100], 'a.ccc': [50] } },
      { 'a.zzz': [100], 'a.ccc': [50], getByName: jest.fn() },
      indexPattern
    ).trim();
    expect(formatted.indexOf('<dt>a.ccc:</dt>')).toBeLessThan(formatted.indexOf('<dt>a.zzz:</dt>'));
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
          getByName: jest.fn(),
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
          getByName: jest.fn(),
        },
        indexPattern
      ).trim()
    ).toMatchInlineSnapshot(
      `"<dl class=\\"source truncate-by-height\\"><dt>object.value:</dt><dd>5, 10</dd> </dl>"`
    );
  });
});
