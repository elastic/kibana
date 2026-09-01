/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord, getShouldShowFieldHandler } from '@kbn/discover-utils';
import { buildDataViewMock, dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DataViewField, type DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import type { JsonValue } from '../components/json_tree_viewer/json_tree_viewer';
import { flattenedToNestedDocument, MAX_TREE_VALUES } from './build_document_tree';

const buildTree = (hit: EsHitRecord): Record<string, unknown> => {
  const { tree } = flattenedToNestedDocument({
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

describe('flattenedToNestedDocument', () => {
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

  describe('selectedColumns filter', () => {
    const treeFrom = (flattened: Record<string, unknown>, selectedColumns?: string[]): JsonValue =>
      flattenedToNestedDocument({
        row: { id: '1', raw: { _id: '1', _index: 'test' }, flattened },
        dataView: dataViewMock,
        columnsMeta: undefined,
        shouldShowFieldHandler: () => true,
        selectedColumns,
      }).tree;

    it('shows the whole document when no columns are selected', () => {
      expect(treeFrom({ bytes: 100, extension: '.gz' })).toEqual({ bytes: 100, extension: '.gz' });
      expect(treeFrom({ bytes: 100, extension: '.gz' }, [])).toEqual({
        bytes: 100,
        extension: '.gz',
      });
    });

    it('keeps only the selected leaf fields', () => {
      expect(treeFrom({ bytes: 100, extension: '.gz' }, ['bytes'])).toEqual({ bytes: 100 });
    });

    it('keeps every descendant of a selected object parent', () => {
      expect(
        treeFrom({ 'user.name': 'Alice', 'user.city': 'Berlin', bytes: 100 }, ['user'])
      ).toEqual({ user: { name: 'Alice', city: 'Berlin' } });
    });

    it('shows an explicitly selected multi-field even though it is hidden by default', () => {
      const tree = flattenedToNestedDocument({
        row: {
          id: '1',
          raw: { _id: '1', _index: 'test' },
          flattened: { name: 'Alice', 'name.keyword': 'Alice' },
        },
        dataView: dataViewMock,
        columnsMeta: undefined,
        // `name.keyword` is a multi-field, hidden by the shared handler.
        shouldShowFieldHandler: (fieldName) => fieldName !== 'name.keyword',
        selectedColumns: ['name.keyword'],
      }).tree;

      expect(tree).toEqual({ name: { keyword: 'Alice' } });
    });

    it('does not reveal a hidden multi-field when only its parent is selected', () => {
      const tree = flattenedToNestedDocument({
        row: {
          id: '1',
          raw: { _id: '1', _index: 'test' },
          flattened: { name: 'Alice', 'name.keyword': 'Alice' },
        },
        dataView: dataViewMock,
        columnsMeta: undefined,
        shouldShowFieldHandler: (fieldName) => fieldName !== 'name.keyword',
        selectedColumns: ['name'],
      }).tree;

      expect(tree).toEqual({ name: 'Alice' });
    });

    it('keeps the parent scalar and the multi-field when both are selected', () => {
      const tree = flattenedToNestedDocument({
        row: {
          id: '1',
          raw: { _id: '1', _index: 'test' },
          flattened: {
            'aws.s3.bucket.name.keyword': 'bucket3',
            'aws.s3.bucket.name': 'bucket3',
          },
        },
        dataView: dataViewMock,
        columnsMeta: undefined,
        shouldShowFieldHandler: (fieldName) => fieldName !== 'aws.s3.bucket.name.keyword',
        selectedColumns: ['aws.s3.bucket.name', 'aws.s3.bucket.name.keyword'],
      }).tree;

      expect(tree).toEqual({
        aws: {
          s3: {
            bucket: {
              name: 'bucket3',
              'name.keyword': 'bucket3',
            },
          },
        },
      });
    });

    it('caches per filter, so changing the selection is not served a stale tree', () => {
      // Same row object across builds: proves the cache keys on the filter, not just row.raw.
      const row: DataTableRecord = {
        id: '1',
        raw: { _id: '1', _index: 'test' },
        flattened: { bytes: 100, extension: '.gz' },
      };
      const build = (selectedColumns?: string[]): JsonValue =>
        flattenedToNestedDocument({
          row,
          dataView: dataViewMock,
          columnsMeta: undefined,
          shouldShowFieldHandler: () => true,
          selectedColumns,
        }).tree;

      expect(build(['bytes'])).toEqual({ bytes: 100 });
      expect(build(['extension'])).toEqual({ extension: '.gz' });
      expect(build()).toEqual({ bytes: 100, extension: '.gz' });
      expect(build(['bytes'])).toEqual({ bytes: 100 });
    });
  });

  it('keeps numeric object keys as objects', () => {
    const tree = buildTree({
      _id: '1',
      _index: 'test',
      _source: undefined,
      fields: {
        'latency.50': [10],
        'latency.95': [100],
        'http.response.status_code.200': [5],
      },
    });

    expect(tree).toEqual({
      latency: { '50': 10, '95': 100 },
      http: { response: { status_code: { '200': 5 } } },
    });
  });

  it('does not pollute Object.prototype when unflattening a nested __proto__ key', () => {
    const { tree } = flattenedToNestedDocument({
      row: {
        id: '1',
        raw: { _id: '1', _index: 'test' },
        flattened: { '__proto__.polluted': true },
      },
      dataView: dataViewMock,
      columnsMeta: undefined,
      shouldShowFieldHandler: () => true,
    });
    if (typeof tree !== 'object' || tree === null || Array.isArray(tree)) {
      throw new Error('expected an object document tree');
    }

    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
    const canary: Record<string, unknown> = {};
    expect(canary.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(tree)).toBeNull();
    expect(Object.getOwnPropertyDescriptor(tree, '__proto__')?.value).toEqual({ polluted: true });
  });

  it('stores a __proto__ field as an own property instead of changing the document prototype', () => {
    // A `{ __proto__: ... }` literal sets the object's prototype; define the field name explicitly.
    const flattened: Record<string, unknown> = {};
    Object.defineProperty(flattened, '__proto__', {
      value: 'own',
      enumerable: true,
      writable: true,
      configurable: true,
    });

    const { tree } = flattenedToNestedDocument({
      row: {
        id: '1',
        raw: { _id: '1', _index: 'test' },
        flattened,
      },
      dataView: dataViewMock,
      columnsMeta: undefined,
      shouldShowFieldHandler: () => true,
    });
    if (typeof tree !== 'object' || tree === null || Array.isArray(tree)) {
      throw new Error('expected an object document tree');
    }

    expect(Object.getPrototypeOf(tree)).toBeNull();
    expect(Object.getOwnPropertyDescriptor(tree, '__proto__')?.value).toBe('own');
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

    const { tree } = flattenedToNestedDocument({
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

  it('decodes ES|QL complex columns delivered as JSON strings into structure', () => {
    // In ES|QL mode `flattened` is the raw columnar row (no array wrapping), and `histogram` /
    // `aggregate_metric_double` arrive as JSON strings rather than the objects the fields API
    // returns. Any string that is perfect JSON is expanded the same way.
    const row: DataTableRecord = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {
        histogram: '{"values":[0.1,0.2,0.3],"counts":[3,7,23]}',
        agg_metric: '{"min":-302.5,"max":702.3,"sum":200,"value_count":25}',
      },
    };

    const { tree } = flattenedToNestedDocument({
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

  it('expands a string field whose entire value is perfect JSON', () => {
    const row: DataTableRecord = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: { note: '{"looks":"like json","n":2}' },
    };

    const { tree } = flattenedToNestedDocument({
      row,
      dataView: dataViewMock,
      columnsMeta: { note: { type: 'string', esType: 'keyword' } },
      shouldShowFieldHandler: () => true,
    });

    expect(tree).toEqual({ note: { looks: 'like json', n: 2 } });
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

    const { tree } = flattenedToNestedDocument({
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

  describe('value budget (MAX_TREE_VALUES)', () => {
    const buildFromFields = (fields: Record<string, unknown>) =>
      flattenedToNestedDocument({
        row: buildDataTableRecord(
          { _id: '1', _index: 'test', _source: undefined, fields },
          dataViewMock
        ),
        dataView: dataViewMock,
        columnsMeta: undefined,
        shouldShowFieldHandler: () => true,
      });

    const asRecord = (tree: JsonValue): Record<string, unknown> => {
      if (typeof tree !== 'object' || tree === null || Array.isArray(tree)) {
        throw new Error('expected an object document tree');
      }
      return tree;
    };

    it('does not truncate a document within the budget', () => {
      const { tree, truncated } = buildFromFields({ a: ['x'], b: ['y'] });

      expect(truncated).toBe(false);
      expect(tree).toEqual({ a: 'x', b: 'y' });
    });

    it('caps a document with more fields than the budget and reports truncation', () => {
      const fields = Object.fromEntries(
        Array.from({ length: MAX_TREE_VALUES + 1 }, (_, i) => [`field_${i}`, [i]])
      );

      const { tree, truncated } = buildFromFields(fields);

      expect(truncated).toBe(true);
      expect(Object.keys(asRecord(tree))).toHaveLength(MAX_TREE_VALUES);
    });

    it('stops walking once the budget is spent, so fields past the cap are absent', () => {
      // `zzz_last` is inserted after the filler fields, so it sits beyond the budget and is never built.
      const fields = {
        ...Object.fromEntries(
          Array.from({ length: MAX_TREE_VALUES }, (_, i) => [`field_${i}`, [i]])
        ),
        zzz_last: ['sentinel'],
      };

      const { tree } = buildFromFields(fields);

      expect(asRecord(tree).zzz_last).toBeUndefined();
    });

    it('slices a single oversized array down to the budget', () => {
      const { tree, truncated } = buildFromFields({
        many: Array.from({ length: MAX_TREE_VALUES + 1 }, (_, i) => i),
      });

      expect(truncated).toBe(true);
      expect(asRecord(tree).many).toHaveLength(MAX_TREE_VALUES);
    });
  });

  describe('hideNulls', () => {
    const buildFromFields = (fields: Record<string, unknown>, hideNulls: boolean) => {
      const { tree, truncated } = flattenedToNestedDocument({
        row: buildDataTableRecord(
          { _id: '1', _index: 'test', _source: undefined, fields },
          dataViewMock
        ),
        dataView: dataViewMock,
        columnsMeta: undefined,
        shouldShowFieldHandler: () => true,
        hideNulls,
      });
      return { tree, truncated };
    };

    it('keeps null values by default', () => {
      expect(buildFromFields({ tags: ['a', null, 'b'], only_null: [null] }, false).tree).toEqual({
        tags: ['a', null, 'b'],
        only_null: null,
      });
    });

    it('drops null values from fields and arrays, omitting fields left with no value', () => {
      expect(buildFromFields({ tags: ['a', null, 'b'], only_null: [null] }, true).tree).toEqual({
        tags: ['a', 'b'],
      });
    });

    it('does not count dropped nulls against the truncation budget', () => {
      // A leading run of nulls larger than the budget, followed by two real values.
      const many = [...Array.from({ length: MAX_TREE_VALUES }, () => null), 'a', 'b'];

      // With nulls kept, they fill the budget and the trailing real values are truncated.
      expect(buildFromFields({ many }, false).truncated).toBe(true);

      // With nulls hidden, they never materialise, so both real values fit within budget.
      const withoutNulls = buildFromFields({ many }, true);
      expect(withoutNulls.truncated).toBe(false);
      expect((withoutNulls.tree as Record<string, unknown>).many).toEqual(['a', 'b']);
    });
  });
});
