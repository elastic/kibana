/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createElement } from 'react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { buildDataViewMock, dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { buildDocumentTree } from './build_document_tree';

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
    fieldFormats,
    columnsMeta: undefined,
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
      fieldFormats,
      columnsMeta: undefined,
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

  it('renders a search-highlighted field as an opaque React node, keeping other values raw', () => {
    const tree = buildTree({
      _id: '1',
      _index: 'test',
      _source: undefined,
      fields: { message: ['hello world'], count: [5] },
      highlight: {
        message: ['@kibana-highlighted-field@hello@/kibana-highlighted-field@ world'],
      },
    });

    // The React node passes through un-flattening untouched — a deep un-flatten would recurse
    // into its (possibly cyclic) internals and overflow the stack. Other values stay raw + typed.
    expect(tree.message).toBe(highlightedNode);
    expect(tree.count).toBe(5);
  });
});
