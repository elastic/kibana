/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom/server';
import { formatRow, formatTopLevelObject } from './row_formatter';
import { DataView } from '@kbn/data-views-plugin/public';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { DiscoverServices } from '../../../build_services';
import { stubbedSavedObjectIndexPattern } from '@kbn/data-plugin/common/stubs';
import { buildDataTableRecord } from '@kbn/discover-utils';

describe('Row formatter', () => {
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

  const dataView = createIndexPattern();
  const rawHit = {
    _id: 'a',
    _index: 'foo',
    _score: 1,
    _source: {
      foo: 'bar',
      number: 42,
      hello: '<h1>World</h1>',
      also: 'with "quotes" or \'single quotes\'',
    },
  };
  const hit = buildDataTableRecord(rawHit, dataView);

  const shouldShowField = (fieldName: string) =>
    dataView.fields.getAll().some((fld) => fld.name === fieldName);

  beforeEach(() => {
    services = {
      fieldFormats: {
        getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => value })),
        getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
      },
    } as unknown as DiscoverServices;
  });

  it('formats document properly', () => {
    expect(formatRow(hit, dataView, shouldShowField, 100, services.fieldFormats))
      .toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "also",
              "with \\"quotes\\" or 'single quotes'",
              "also",
            ],
            Array [
              "foo",
              "bar",
              "foo",
            ],
            Array [
              "hello",
              "<h1>World</h1>",
              "hello",
            ],
            Array [
              "number",
              42,
              "number",
            ],
            Array [
              "_id",
              "a",
              "_id",
            ],
            Array [
              "_score",
              1,
              "_score",
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
    expect(formatRow(hit, dataView, () => false, 1, services.fieldFormats)).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "also",
              "with \\"quotes\\" or 'single quotes'",
              "also",
            ],
            Array [
              "and 4 more fields",
              "",
              null,
            ],
          ]
        }
      />
    `);
  });

  it('formats document with highlighted fields first', () => {
    const highLightHit = buildDataTableRecord(
      { ...rawHit, highlight: { number: ['42'] } },
      dataView
    );

    expect(formatRow(highLightHit, dataView, shouldShowField, 100, services.fieldFormats))
      .toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "number",
              42,
              "number",
            ],
            Array [
              "also",
              "with \\"quotes\\" or 'single quotes'",
              "also",
            ],
            Array [
              "foo",
              "bar",
              "foo",
            ],
            Array [
              "hello",
              "<h1>World</h1>",
              "hello",
            ],
            Array [
              "_id",
              "a",
              "_id",
            ],
            Array [
              "_score",
              1,
              "_score",
            ],
          ]
        }
      />
    `);
  });

  it('formats top level objects using formatter', () => {
    dataView.getFieldByName = jest.fn().mockReturnValue({
      name: 'subfield',
    });
    dataView.getFormatterForField = jest.fn().mockReturnValue({
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
        dataView,
        100
      )
    ).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "object.value",
              "formatted, formatted",
              "object.value",
            ],
          ]
        }
      />
    `);
  });

  it('formats top level objects in alphabetical order', () => {
    dataView.getFieldByName = jest.fn().mockReturnValue({
      name: 'subfield',
    });
    dataView.getFormatterForField = jest.fn().mockReturnValue({
      convert: () => 'formatted',
    });
    const formatted = ReactDOM.renderToStaticMarkup(
      formatTopLevelObject(
        { fields: { 'a.zzz': [100], 'a.ccc': [50] } },
        { 'a.zzz': [100], 'a.ccc': [50], getByName: jest.fn() },
        dataView,
        100
      )
    );
    expect(formatted.indexOf('<dt>a.ccc:</dt>')).toBeLessThan(formatted.indexOf('<dt>a.zzz:</dt>'));
  });

  it('formats top level objects with subfields and highlights', () => {
    dataView.getFieldByName = jest.fn().mockReturnValue({
      name: 'subfield',
    });
    dataView.getFormatterForField = jest.fn().mockReturnValue({
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
        dataView,
        100
      )
    ).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "object.keys",
              "formatted, formatted",
              "object.keys",
            ],
            Array [
              "object.value",
              "formatted, formatted",
              "object.value",
            ],
          ]
        }
      />
    `);
  });

  it('formats top level objects, converting unknown fields to string', () => {
    dataView.getFieldByName = jest.fn();
    dataView.getFormatterForField = jest.fn();
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
        dataView,
        100
      )
    ).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "object.value",
              "5, 10",
              "object.value",
            ],
          ]
        }
      />
    `);
  });
});
