/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createElement } from 'react';
import { buildDataTableRecord, getShouldShowFieldHandler } from '@kbn/discover-utils';
import { buildDataViewMock, dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DataViewField, type DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { buildDocumentTree, createHighlightFormatter } from './build_document_tree';

// Stands in for the marked-up React the real highlight formatter returns for matched terms.
const highlightedNode = createElement('span', {}, 'highlighted');

// A default string formatter, matching the pattern used by the neighbouring
// get_render_cell_value.test.tsx for the fieldFormats service. `convertToReact` is the
// highlight-rendering path.
const fieldFormats = {
  getDefaultInstance: () => ({
    convertToText: (value: unknown) => String(value),
    convertToReact: () => highlightedNode,
  }),
} as unknown as FieldFormatsStart;

const buildTree = (hit: EsHitRecord): Record<string, unknown> => {
  const tree = buildDocumentTree({
    row: buildDataTableRecord(hit, dataViewMock),
    dataView: dataViewMock,
    columnsMeta: undefined,
    shouldShowFieldHandler: () => true,
  });
  if (typeof tree !== 'object' || tree === null || Array.isArray(tree)) {
    throw new Error('expected an object document tree');
  }
  return tree;
};

describe('buildDocumentTree', () => {
  it('un-flattens dotted keys, unwraps single-value arrays, and keeps genuine multi-value arrays', () => {
    const tree = buildTree({
      _id: '1',
      _index: 'test',
      _source: undefined,
      // The fields API wraps every value in an array and flattens nested objects to dotted keys.
      fields: {
        'user.name': ['Alice'],
        'user.address.city': ['Berlin'],
        tags: ['authentication', 'security'],
      },
    });

    expect(tree).toEqual({
      user: { name: 'Alice', address: { city: 'Berlin' } },
      tags: ['authentication', 'security'],
    });
  });

  it('preserves number and boolean types (so the tree still colours them by type)', () => {
    const tree = buildTree({
      _id: '1',
      _index: 'test',
      _source: undefined,
      fields: { bytes: [1024], active: [true] },
    });

    expect(tree).toEqual({ bytes: 1024, active: true });
  });

  it('drops Elasticsearch meta fields from the document', () => {
    const tree = buildTree({
      _id: '1',
      _index: 'test',
      _score: 1,
      _source: undefined,
      fields: { message: ['hello'] },
    });

    // Full equality: the presence of any `_id`/`_index`/`_score` key would fail this.
    expect(tree).toEqual({ message: 'hello' });
  });

  it('recurses into a nested field when its container is absent from the data view', () => {
    const tree = buildTree({
      _id: '1',
      _index: 'test',
      _source: undefined,
      // ES returns a `nested`-mapped field correlated as an array-of-objects under one key.
      fields: {
        comments: [
          { author: ['Bob'], text: ['Nice'] },
          { author: ['Amy'], text: ['Cool'] },
        ],
      },
    });

    expect(tree).toEqual({
      comments: [
        { author: 'Bob', text: 'Nice' },
        { author: 'Amy', text: 'Cool' },
      ],
    });
  });

  it('recurses into a nested field when its container is present as a `nested`-typed field', () => {
    // In practice Discover often keeps the `nested` container in the data view, so the field
    // lookup returns it — recursion must still fire (and not fall through to the formatter,
    // which would stringify the objects).
    const nestedDataView = buildDataViewMock({
      name: 'nested-view',
      fields: [{ name: 'comments', type: 'nested' }] as DataView['fields'],
    });
    const row = buildDataTableRecord(
      {
        _id: '1',
        _index: 'test',
        _source: undefined,
        fields: {
          comments: [
            { author: ['bob'], text: ['Nice post'], likes: [3] },
            { author: ['carol'], text: ['Agreed'], likes: [1] },
          ],
        },
      },
      nestedDataView
    );

    const tree = buildDocumentTree({
      row,
      dataView: nestedDataView,
      columnsMeta: undefined,
      shouldShowFieldHandler: () => true,
    });

    expect(tree).toEqual({
      comments: [
        { author: 'bob', text: 'Nice post', likes: 3 },
        { author: 'carol', text: 'Agreed', likes: 1 },
      ],
    });
  });

  it('keeps object-mapped arrays as object-of-arrays (correlation is unrecoverable)', () => {
    const tree = buildTree({
      _id: '1',
      _index: 'test',
      _source: undefined,
      // An `object`-mapped array (e.g. ecommerce `products`) is decorrelated by ES into
      // parallel dotted keys with no per-element correlation to recover.
      fields: {
        'products.base_price': [11.99, 24.99],
        'products.product_name': ['Shoes', 'Hat'],
      },
    });

    expect(tree).toEqual({
      products: { base_price: [11.99, 24.99], product_name: ['Shoes', 'Hat'] },
    });
  });

  it('keeps a search-highlighted field raw (highlighting is applied later by the formatter)', () => {
    const tree = buildTree({
      _id: '1',
      _index: 'test',
      _source: undefined,
      fields: { message: ['hello world'], count: [5] },
      highlight: {
        message: ['@kibana-highlighted-field@hello@/kibana-highlighted-field@ world'],
      },
    });

    // The tree now carries only raw values; `createHighlightFormatter` marks matches at render time.
    expect(tree).toEqual({ message: 'hello world', count: 5 });
  });

  it('decodes ES|QL complex columns delivered as JSON strings into structure (via esType)', () => {
    // In ES|QL mode `flattened` is the raw columnar row (no array wrapping), and `histogram` /
    // `aggregate_metric_double` arrive as JSON strings rather than the objects the fields API
    // returns. `columnsMeta` carries the ES type that marks them for decoding.
    const row: DataTableRecord = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {
        histogram: '{"values":[0.1,0.2,0.3],"counts":[3,7,23]}',
        agg_metric: '{"min":-302.5,"max":702.3,"sum":200,"value_count":25}',
      },
    };

    const tree = buildDocumentTree({
      row,
      dataView: dataViewMock,
      columnsMeta: {
        histogram: { type: 'number', esType: 'histogram' },
        agg_metric: { type: 'number', esType: 'aggregate_metric_double' },
      },
      shouldShowFieldHandler: () => true,
    });

    expect(tree).toEqual({
      histogram: { values: [0.1, 0.2, 0.3], counts: [3, 7, 23] },
      agg_metric: { min: -302.5, max: 702.3, sum: 200, value_count: 25 },
    });
  });

  it('leaves a JSON-looking ES|QL keyword string untouched (only known complex types decode)', () => {
    // The decode is gated on the ES type: a genuine keyword whose value merely looks like JSON
    // must stay a raw string.
    const row: DataTableRecord = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: { note: '{"looks":"like json"}' },
    };

    const tree = buildDocumentTree({
      row,
      dataView: dataViewMock,
      columnsMeta: { note: { type: 'string', esType: 'keyword' } },
      shouldShowFieldHandler: () => true,
    });

    expect(tree).toEqual({ note: '{"looks":"like json"}' });
  });

  it('drops multi-fields (agent.keyword), keeping the parent scalar', () => {
    // The fields API returns both the parent `agent` and its `keyword` multi-field. Un-flattening
    // `agent.keyword` would nest it as `{ agent: { keyword } }` and clobber the parent scalar; the
    // shared `shouldShowFieldHandler` hides the multi-field just like the Summary column does.
    const dataView = buildDataViewMock({
      name: 'multifield-view',
      fields: [
        new DataViewField({ name: 'agent', type: 'string', searchable: true, aggregatable: false }),
        new DataViewField({
          name: 'agent.keyword',
          type: 'string',
          searchable: true,
          aggregatable: true,
          subType: { multi: { parent: 'agent' } },
        }),
      ] as DataView['fields'],
    });
    const row = buildDataTableRecord(
      {
        _id: '1',
        _index: 'test',
        _source: undefined,
        fields: { agent: ['Mozilla/5.0'], 'agent.keyword': ['Mozilla/5.0'] },
      },
      dataView
    );

    const tree = buildDocumentTree({
      row,
      dataView,
      columnsMeta: undefined,
      shouldShowFieldHandler: getShouldShowFieldHandler(
        ['agent', 'agent.keyword'],
        dataView,
        false
      ),
    });

    expect(tree).toEqual({ agent: 'Mozilla/5.0' });
  });
});

describe('createHighlightFormatter', () => {
  const hitWith = (highlight?: Record<string, string[]>): EsHitRecord => ({
    _id: '1',
    _index: 'test',
    ...(highlight ? { highlight } : {}),
  });

  it('formats a highlighted field, resolving the field name from the leaf path', () => {
    const formatValue = createHighlightFormatter({
      hit: hitWith({ 'user.name': ['@kibana-highlighted-field@Alice@/kibana-highlighted-field@'] }),
      dataView: dataViewMock,
      fieldFormats,
    });

    expect(formatValue({ value: 'Alice', path: ['user', 'name'] })).toBe(highlightedNode);
  });

  it('drops array indices when resolving the field name', () => {
    const formatValue = createHighlightFormatter({
      hit: hitWith({ tags: ['@kibana-highlighted-field@security@/kibana-highlighted-field@'] }),
      dataView: dataViewMock,
      fieldFormats,
    });

    expect(formatValue({ value: 'security', path: ['tags', '0'] })).toBe(highlightedNode);
  });

  it('returns undefined for a field the query did not highlight', () => {
    const formatValue = createHighlightFormatter({
      hit: hitWith({ other: ['x'] }),
      dataView: dataViewMock,
      fieldFormats,
    });

    expect(formatValue({ value: 'Alice', path: ['user', 'name'] })).toBeUndefined();
  });

  it('returns undefined for a null value', () => {
    const formatValue = createHighlightFormatter({
      hit: hitWith({ 'user.name': ['x'] }),
      dataView: dataViewMock,
      fieldFormats,
    });

    expect(formatValue({ value: null, path: ['user', 'name'] })).toBeUndefined();
  });
});
