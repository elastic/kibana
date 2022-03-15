/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom/server';
import { formatRow, formatTopLevelObject } from './row_formatter';
import { DataView } from '../../../../../data_views/public';
import { fieldFormatsMock } from '../../../../../field_formats/common/mocks';
import { DiscoverServices } from '../../../build_services';
import { stubbedSavedObjectIndexPattern } from '../../../../../data/common/stubs';

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
  let services: DiscoverServices;

  const createIndexPattern = () => {
    const id = 'my-index';
    const {
      type,
      version,
      attributes: { timeFieldName, fields, title },
    } = stubbedSavedObjectIndexPattern(id);

    return new DataView({
      spec: { id, type, version, timeFieldName, fields: JSON.parse(fields), title },
      fieldFormats: fieldFormatsMock,
      shortDotsEnable: false,
      metaFields: ['_id', '_type', '_score'],
    });
  };

  const indexPattern = createIndexPattern();

  const fieldsToShow = indexPattern.fields.getAll().map((fld) => fld.name);

  beforeEach(() => {
    services = {
      fieldFormats: {
        getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => value })),
        getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
      },
    } as unknown as DiscoverServices;
  });

  it('formats document properly', () => {
    expect(formatRow(hit, indexPattern, fieldsToShow, 100, services.fieldFormats))
      .toMatchInlineSnapshot(`
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
          ]
        }
      />
    `);
  });

  it('limits number of rendered items', () => {
    services = {
      uiSettings: {
        get: () => 1,
      },
      fieldFormats: {
        getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => value })),
        getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
      },
    } as unknown as DiscoverServices;
    expect(formatRow(hit, indexPattern, [], 1, services.fieldFormats)).toMatchInlineSnapshot(`
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
          ]
        }
      />
    `);
  });

  it('formats document with highlighted fields first', () => {
    expect(
      formatRow(
        { ...hit, highlight: { number: ['42'] } },
        indexPattern,
        fieldsToShow,
        100,
        services.fieldFormats
      )
    ).toMatchInlineSnapshot(`
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
          fields: {
            'object.value': [5, 10],
          },
        },
        {
          'object.value': [5, 10],
          getByName: jest.fn(),
        },
        indexPattern,
        100
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
        { fields: { 'a.zzz': [100], 'a.ccc': [50] } },
        { 'a.zzz': [100], 'a.ccc': [50], getByName: jest.fn() },
        indexPattern,
        100
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
        indexPattern,
        100
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
          fields: {
            'object.value': [5, 10],
          },
        },
        {
          'object.value': [5, 10],
          getByName: jest.fn(),
        },
        indexPattern,
        100
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
});
