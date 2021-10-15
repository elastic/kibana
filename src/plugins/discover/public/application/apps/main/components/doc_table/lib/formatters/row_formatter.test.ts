/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom/server';
import { formatRow, formatTopLevelObject } from './row_formatter';
import { setServices } from '../../../../../../../kibana_services';
import { DiscoverServices } from '../../../../../../../build_services';
import { indexPattern, hit } from './mocks';

describe('Row formatter', () => {
  const maxHeight = 115;
  const fieldsToShow = indexPattern.fields.getAll().map((fld) => fld.name);

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
    setServices({
      uiSettings: {
        get: () => 100,
      },
    } as unknown as DiscoverServices);
  });

  it('formats document properly', () => {
    expect(formatRow(hit, indexPattern, fieldsToShow, maxHeight)).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "also",
              "with \\\\&quot;quotes\\\\&quot; or &#39;single qoutes&#39;",
            ],
            Array [
              "foo",
              "bar",
            ],
            Array [
              "number",
              "42",
            ],
            Array [
              "hello",
              "&lt;h1&gt;World&lt;/h1&gt;",
            ],
            Array [
              "_id",
              "a",
            ],
            Array [
              "_type",
              "doc",
            ],
            Array [
              "_score",
              1,
            ],
          ]
        }
        maxHeight={115}
      />
    `);
  });

  it('limits number of rendered items', () => {
    setServices({
      uiSettings: {
        get: () => 1,
      },
    } as unknown as DiscoverServices);
    expect(formatRow(hit, indexPattern, [], maxHeight)).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "also",
              "with \\\\&quot;quotes\\\\&quot; or &#39;single qoutes&#39;",
            ],
          ]
        }
        maxHeight={115}
      />
    `);
  });

  it('formats document with highlighted fields first', () => {
    expect(
      formatRow({ ...hit, highlight: { number: '42' } }, indexPattern, fieldsToShow, maxHeight)
    ).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "number",
              "42",
            ],
            Array [
              "also",
              "with \\\\&quot;quotes\\\\&quot; or &#39;single qoutes&#39;",
            ],
            Array [
              "foo",
              "bar",
            ],
            Array [
              "hello",
              "&lt;h1&gt;World&lt;/h1&gt;",
            ],
            Array [
              "_id",
              "a",
            ],
            Array [
              "_type",
              "doc",
            ],
            Array [
              "_score",
              1,
            ],
          ]
        }
        maxHeight={115}
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
        maxHeight
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
        maxHeight={115}
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
        maxHeight
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
        maxHeight
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
        maxHeight={115}
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
        maxHeight
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
        maxHeight={115}
      />
    `);
  });
});
