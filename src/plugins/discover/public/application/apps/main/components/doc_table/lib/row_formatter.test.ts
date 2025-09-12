/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom/server';
import { formatRow, formatTopLevelObject } from './row_formatter';
import { IndexPattern } from '../../../../../../../../data/common';
import { fieldFormatsMock } from '../../../../../../../../field_formats/common/mocks';
import { setServices } from '../../../../../../kibana_services';
import { DiscoverServices } from '../../../../../../build_services';
import { stubbedSavedObjectIndexPattern } from '../../../../../../../../data/common/stubs';

let mockConvert = jest.fn();
describe('Row formatter', () => {
  const hit = {
    _id: 'a',
    _index: 'foo',
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
      spec: { id, type, version, timeFieldName, fields: JSON.parse(fields), title },
      fieldFormats: fieldFormatsMock,
      shortDotsEnable: false,
      metaFields: ['_id', '_type', '_score'],
    });
  };

  const indexPattern = createIndexPattern();

  const fieldsToShow = indexPattern.fields.getAll().map((fld) => fld.name);

  beforeEach(() => {
    mockConvert = jest.fn((value) => value);
    setServices({
      uiSettings: {
        get: () => 100,
      },
      fieldFormats: {
        getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => mockConvert(value) })),
        getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
      },
    } as unknown as DiscoverServices);
  });

  it('formats document properly', () => {
    expect(formatRow(hit, indexPattern, fieldsToShow)).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "also",
              "with \\"quotes\\" or 'single quotes'",
            ],
            Array [
              "foo",
              "bar",
            ],
            Array [
              "hello",
              "<h1>World</h1>",
            ],
            Array [
              "number",
              42,
            ],
            Array [
              "_id",
              "a",
            ],
            Array [
              "_score",
              1,
            ],
            Array [
              "_type",
              "doc",
            ],
          ]
        }
      />
    `);
  });

  it('limits number of rendered items', () => {
    setServices({
      uiSettings: {
        get: () => 1,
      },
      fieldFormats: {
        getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => value })),
        getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
      },
    } as unknown as DiscoverServices);
    expect(formatRow(hit, indexPattern, [])).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "also",
              "with \\"quotes\\" or 'single quotes'",
            ],
            Array [
              "foo",
              "bar",
            ],
            Array [
              "hello",
              "<h1>World</h1>",
            ],
            Array [
              "number",
              42,
            ],
            Array [
              "_id",
              "a",
            ],
            Array [
              "_score",
              1,
            ],
            Array [
              "_type",
              "doc",
            ],
          ]
        }
      />
    `);
  });

  it('formats document with highlighted fields first', () => {
    expect(formatRow({ ...hit, highlight: { number: ['42'] } }, indexPattern, fieldsToShow))
      .toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "number",
              42,
            ],
            Array [
              "also",
              "with \\"quotes\\" or 'single quotes'",
            ],
            Array [
              "foo",
              "bar",
            ],
            Array [
              "hello",
              "<h1>World</h1>",
            ],
            Array [
              "_id",
              "a",
            ],
            Array [
              "_score",
              1,
            ],
            Array [
              "_type",
              "doc",
            ],
          ]
        }
      />
    `);
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
          _id: '1',
          _index: 'test',
          fields: {
            'object.value': [5, 10],
          },
        },
        {
          'object.value': [5, 10],
          getByName: jest.fn(),
        },
        indexPattern
      )
    ).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "object.value",
              "formatted, formatted",
            ],
          ]
        }
      />
    `);
  });

  it('formats top level objects in alphabetical order', () => {
    indexPattern.getFieldByName = jest.fn().mockReturnValue({
      name: 'subfield',
    });
    indexPattern.getFormatterForField = jest.fn().mockReturnValue({
      convert: () => 'formatted',
    });
    const formatted = ReactDOM.renderToStaticMarkup(
      formatTopLevelObject(
        {
          _id: '1',
          _index: 'test',
          fields: { 'a.zzz': [100], 'a.ccc': [50] },
        },
        { 'a.zzz': [100], 'a.ccc': [50], getByName: jest.fn() },
        indexPattern
      )
    );
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
          _id: '1',
          _index: 'test',
          fields: {
            'object.value': [5, 10],
            'object.keys': ['a', 'b'],
          },
          highlight: {
            'object.keys': ['a'],
          },
        },
        {
          'object.value': [5, 10],
          'object.keys': ['a', 'b'],
          getByName: jest.fn(),
        },
        indexPattern
      )
    ).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "object.keys",
              "formatted, formatted",
            ],
            Array [
              "object.value",
              "formatted, formatted",
            ],
          ]
        }
      />
    `);
  });

  it('formats top level objects, converting unknown fields to string', () => {
    indexPattern.getFieldByName = jest.fn();
    indexPattern.getFormatterForField = jest.fn();
    expect(
      formatTopLevelObject(
        {
          _id: '1',
          _index: 'test',
          fields: {
            'object.value': [5, 10],
          },
        },
        {
          'object.value': [5, 10],
          getByName: jest.fn(),
        },
        indexPattern
      )
    ).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "object.value",
              "5, 10",
            ],
          ]
        }
      />
    `);
  });

  it('passes values through default formatter for unmapped objects', () => {
    mockConvert = jest.fn((value: unknown) => `${value}`.replaceAll('foo', 'bar'));
    indexPattern.getFieldByName = jest.fn().mockReturnValue(undefined);
    setServices({
      uiSettings: {
        get: () => 100,
      },
      fieldFormats: {
        getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => mockConvert(value) })),
        getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => mockConvert(value) })),
      },
    } as unknown as DiscoverServices);

    const formatted = formatTopLevelObject(
      {
        _id: '1',
        _index: 'test',
        fields: {
          'foo.data': ['my foo value'],
        },
      },
      {
        'foo.data': ['my foo value'],
        getByName: jest.fn(),
      },
      indexPattern
    );
    expect(mockConvert).toHaveBeenCalled();
    expect(ReactDOM.renderToStaticMarkup(formatted)).toContain('my bar value');
  });
});
