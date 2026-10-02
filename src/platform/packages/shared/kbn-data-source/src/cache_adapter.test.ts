/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  getOrRegisterEsqlDataView,
  getRegisteredEsqlDataView,
  registerEsqlSourceInDataViewsCache,
  unregisterFromDataViewsCache,
} from './cache_adapter';
import { EsqlSource } from './sources/esql_source';
import { createMockDataViewsService } from './__mocks__/data_views_service.mock';

const makeColumn = (name: string, type: string, esType?: string, isComputedColumn?: boolean) =>
  ({
    id: name,
    name,
    meta: { type, esType },
    ...(isComputedColumn ? { isComputedColumn: true } : {}),
  } as DatatableColumn);

const fieldCapsFields: Record<string, FieldSpec> = {
  '@timestamp': {
    name: '@timestamp',
    type: KBN_FIELD_TYPES.DATE,
    esTypes: ['date'],
    searchable: true,
    aggregatable: true,
  },
  bytes: {
    name: 'bytes',
    type: KBN_FIELD_TYPES.NUMBER,
    esTypes: ['long'],
    searchable: true,
    aggregatable: true,
  },
  message: {
    name: 'message',
    type: KBN_FIELD_TYPES.STRING,
    esTypes: ['text'],
    searchable: true,
    aggregatable: false,
  },
};

const fieldNames = (dataView: { fields: { getAll: () => Array<{ name: string }> } }) =>
  dataView.fields
    .getAll()
    .map(({ name }) => name)
    .sort();

describe('registerEsqlSourceInDataViewsCache', () => {
  beforeEach(() => EsqlSource.clearCache());

  describe('sources with field caps', () => {
    it('uses the fields of the FROM target, not the result columns of the query', async () => {
      const dataViews = createMockDataViewsService({ fieldCapsFields });
      const source = await EsqlSource.create({
        query: 'FROM logs-* | STATS avg_bytes = AVG(bytes) BY message',
        resultColumns: [
          makeColumn('avg_bytes', 'number', 'double', true),
          makeColumn('message', 'string', 'text'),
        ],
        timeFieldName: '@timestamp',
      });

      const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);

      expect(fieldNames(dataView)).toEqual(['@timestamp', 'bytes', 'message']);
    });

    it('creates the DataView with the ES|QL type and the dataset time field', async () => {
      const dataViews = createMockDataViewsService({ fieldCapsFields });
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        timeFieldName: '@timestamp',
      });

      await registerEsqlSourceInDataViewsCache(dataViews, source);

      expect(dataViews.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^esql-dataset-/),
          title: 'logs-*',
          type: ESQL_TYPE,
          timeFieldName: '@timestamp',
        }),
        false,
        false
      );
    });

    it('shares one DataView between queries on the same dataset', async () => {
      const dataViews = createMockDataViewsService({ fieldCapsFields });
      const first = await EsqlSource.create({ query: 'FROM logs-* | KEEP bytes' });
      const second = await EsqlSource.create({ query: 'FROM logs-* | KEEP message' });

      const firstDataView = await registerEsqlSourceInDataViewsCache(dataViews, first);
      const secondDataView = await registerEsqlSourceInDataViewsCache(dataViews, second);

      expect(first.id).not.toBe(second.id);
      expect(secondDataView).toBe(firstDataView);
      expect(secondDataView.id).toBe(firstDataView.id);
    });

    it('uses a different DataView for another time field or project routing', async () => {
      const dataViews = createMockDataViewsService({ fieldCapsFields });
      const base = await EsqlSource.create({ query: 'FROM logs-*', timeFieldName: '@timestamp' });
      const otherTimeField = await EsqlSource.create({
        query: 'FROM logs-*',
        timeFieldName: 'event.ingested',
      });
      const otherRouting = await EsqlSource.create({
        query: 'FROM logs-*',
        timeFieldName: '@timestamp',
        projectRouting: '_alias:_origin',
      });

      const ids = await Promise.all(
        [base, otherTimeField, otherRouting].map(
          async (source) => (await registerEsqlSourceInDataViewsCache(dataViews, source)).id
        )
      );

      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('sources without field caps (views, external datasets)', () => {
    it('falls back to the result columns when field caps return no fields', async () => {
      const dataViews = createMockDataViewsService();
      const source = await EsqlSource.create({
        query: 'FROM my_view',
        resultColumns: [makeColumn('host', 'string', 'keyword'), makeColumn('bytes', 'number')],
      });

      const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);

      expect(fieldNames(dataView)).toEqual(['bytes', 'host']);
    });

    it('falls back to the result columns when field caps fail, without fetching them again', async () => {
      const dataViews = createMockDataViewsService({ fieldCapsThrows: true });
      const source = await EsqlSource.create({
        query: 'FROM my_view',
        resultColumns: [makeColumn('host', 'string', 'keyword')],
      });

      const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);

      expect(fieldNames(dataView)).toEqual(['host']);
      expect(dataViews.create).toHaveBeenLastCalledWith(expect.anything(), true);
    });

    it('keeps the time field when the result columns do not contain it', async () => {
      const dataViews = createMockDataViewsService();
      const source = await EsqlSource.create({
        query: 'FROM my_view | KEEP host',
        resultColumns: [makeColumn('host', 'string', 'keyword')],
        timeFieldName: '@timestamp',
      });

      const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);

      expect(dataView.fields.getByName('@timestamp')?.type).toBe(KBN_FIELD_TYPES.DATE);
      expect(dataView.isTimeBased()).toBe(true);
    });

    it('replaces the fields with those of the next query on the same dataset', async () => {
      const dataViews = createMockDataViewsService();
      const first = await EsqlSource.create({
        query: 'FROM my_view | KEEP host',
        resultColumns: [makeColumn('host', 'string', 'keyword')],
      });
      const second = await EsqlSource.create({
        query: 'FROM my_view | KEEP bytes',
        resultColumns: [makeColumn('bytes', 'number')],
      });

      await registerEsqlSourceInDataViewsCache(dataViews, first);
      const dataView = await registerEsqlSourceInDataViewsCache(dataViews, second);

      expect(fieldNames(dataView)).toEqual(['bytes']);
    });
  });
});

describe('getRegisteredEsqlDataView and getOrRegisterEsqlDataView', () => {
  beforeEach(() => EsqlSource.clearCache());

  it('returns the DataView registered for the source', async () => {
    const dataViews = createMockDataViewsService({ fieldCapsFields });
    const source = await EsqlSource.create({ query: 'FROM registered-*' });
    expect(getRegisteredEsqlDataView(source)).toBeUndefined();

    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);

    expect(getRegisteredEsqlDataView(source)).toBe(dataView);
  });

  it('does not register again when the source is already registered', async () => {
    const dataViews = createMockDataViewsService({ fieldCapsFields });
    const source = await EsqlSource.create({ query: 'FROM reused-*' });
    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);
    dataViews.create.mockClear();

    expect(await getOrRegisterEsqlDataView(dataViews, source)).toBe(dataView);
    expect(await getOrRegisterEsqlDataView(dataViews, source.withColumns([]))).toBe(dataView);
    expect(dataViews.create).not.toHaveBeenCalled();
  });

  it('registers when the source is not registered yet', async () => {
    const dataViews = createMockDataViewsService({ fieldCapsFields });
    const source = await EsqlSource.create({ query: 'FROM new-*' });

    const dataView = await getOrRegisterEsqlDataView(dataViews, source);

    expect(getRegisteredEsqlDataView(source)).toBe(dataView);
  });
});

describe('unregisterFromDataViewsCache', () => {
  beforeEach(() => EsqlSource.clearCache());

  it('forgets the source without dropping the DataView shared by its dataset', async () => {
    const dataViews = createMockDataViewsService({ fieldCapsFields });
    const source = await EsqlSource.create({ query: 'FROM shared-* | KEEP bytes' });
    const other = await EsqlSource.create({ query: 'FROM shared-* | KEEP message' });
    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);
    await registerEsqlSourceInDataViewsCache(dataViews, other);

    unregisterFromDataViewsCache(dataViews, source.id);

    expect(getRegisteredEsqlDataView(source)).toBeUndefined();
    expect(getRegisteredEsqlDataView(other)).toBe(dataView);
    expect(await registerEsqlSourceInDataViewsCache(dataViews, other)).toBe(dataView);
  });
});
