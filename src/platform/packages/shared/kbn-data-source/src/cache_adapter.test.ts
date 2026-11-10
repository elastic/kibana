/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { getESQLAdHocDataviewId } from '@kbn/esql-utils';
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

const datasetColumns = [
  makeColumn('@timestamp', 'date', 'date'),
  makeColumn('bytes', 'number', 'long'),
  makeColumn('message', 'string', 'text'),
];

/** Resolves the schema of `FROM <title>`, as the LIMIT 0 request would. */
const seedDataset = (
  title: string,
  timeFieldName?: string,
  resultColumns: DatatableColumn[] = datasetColumns
) => EsqlSource.create({ query: `FROM ${title}`, timeFieldName, resultColumns });

const fieldNames = (dataView: { fields: { getAll: () => Array<{ name: string }> } }) =>
  dataView.fields
    .getAll()
    .map(({ name }) => name)
    .sort();

describe('registerEsqlSourceInDataViewsCache', () => {
  beforeEach(() => EsqlSource.clearCache());

  it('uses the fields of the FROM target, not the result columns of the query', async () => {
    const dataViews = createMockDataViewsService();
    await seedDataset('stats-*', '@timestamp');
    const source = await EsqlSource.create({
      query: 'FROM stats-* | STATS avg_bytes = AVG(bytes) BY message',
      resultColumns: [
        makeColumn('avg_bytes', 'number', 'double', true),
        makeColumn('message', 'string', 'text'),
      ],
      timeFieldName: '@timestamp',
    });

    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);

    expect(fieldNames(dataView)).toEqual(['@timestamp', 'bytes', 'message']);
    expect(dataView.fields.getByName('bytes')?.isComputedColumn).toBe(false);
  });

  it('marks keyword fields aggregatable and text fields not, so KQL suggests values', async () => {
    const dataViews = createMockDataViewsService();
    await seedDataset('agg-*', undefined, [
      makeColumn('host', 'string', 'keyword'),
      makeColumn('message', 'string', 'text'),
    ]);
    const source = await EsqlSource.create({ query: 'FROM agg-* | STATS c = COUNT(*) BY host' });

    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);

    expect(dataView.fields.getByName('host')?.aggregatable).toBe(true);
    expect(dataView.fields.getByName('message')?.aggregatable).toBe(false);
  });

  it('creates the DataView with the legacy ad-hoc id, ES|QL type and time field, without field caps', async () => {
    const dataViews = createMockDataViewsService();
    await seedDataset('spec-*', '@timestamp');
    const source = await EsqlSource.create({
      query: 'FROM spec-* | KEEP bytes',
      timeFieldName: '@timestamp',
    });

    await registerEsqlSourceInDataViewsCache(dataViews, source);

    expect(dataViews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: await getESQLAdHocDataviewId({
          indexPattern: 'spec-*',
          timeFieldName: '@timestamp',
          projectRouting: undefined,
        }),
        title: 'spec-*',
        type: ESQL_TYPE,
        timeFieldName: '@timestamp',
      }),
      true
    );
  });

  it('shares one DataView between queries on the same dataset', async () => {
    const dataViews = createMockDataViewsService();
    await seedDataset('shared-*');
    const first = await EsqlSource.create({ query: 'FROM shared-* | KEEP bytes' });
    const second = await EsqlSource.create({ query: 'FROM shared-* | KEEP message' });

    const firstDataView = await registerEsqlSourceInDataViewsCache(dataViews, first);
    const secondDataView = await registerEsqlSourceInDataViewsCache(dataViews, second);

    expect(first.id).not.toBe(second.id);
    expect(secondDataView).toBe(firstDataView);
  });

  it('uses a different DataView for another time field or project routing', async () => {
    const dataViews = createMockDataViewsService();
    const base = await EsqlSource.create({ query: 'FROM ids-*', timeFieldName: '@timestamp' });
    const otherTimeField = await EsqlSource.create({
      query: 'FROM ids-*',
      timeFieldName: 'event.ingested',
    });
    const otherRouting = await EsqlSource.create({
      query: 'FROM ids-*',
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

  it('keeps the time field when the dataset schema does not contain it', async () => {
    const dataViews = createMockDataViewsService();
    await seedDataset('my_view', '@timestamp', [makeColumn('host', 'string', 'keyword')]);
    const source = await EsqlSource.create({
      query: 'FROM my_view | KEEP host',
      timeFieldName: '@timestamp',
    });

    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);

    expect(dataView.fields.getByName('@timestamp')?.type).toBe(KBN_FIELD_TYPES.DATE);
    expect(dataView.isTimeBased()).toBe(true);
  });

  it('replaces a cached legacy DataView with the same id that lacks the dataset fields', async () => {
    const dataViews = createMockDataViewsService();
    await seedDataset('my_view', '@timestamp', [makeColumn('host', 'string', 'keyword')]);
    const source = await EsqlSource.create({
      query: 'FROM my_view | KEEP host',
      timeFieldName: '@timestamp',
    });
    const legacyId = await getESQLAdHocDataviewId({
      indexPattern: 'my_view',
      timeFieldName: '@timestamp',
      projectRouting: undefined,
    });
    const legacy = await dataViews.create({ id: legacyId, title: 'my_view', type: ESQL_TYPE });

    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);

    expect(dataView).not.toBe(legacy);
    expect(fieldNames(dataView)).toEqual(['@timestamp', 'host']);
  });

  it('keeps a cached DataView with the same id that has the dataset fields', async () => {
    const dataViews = createMockDataViewsService();
    await seedDataset('logs-*', undefined, [makeColumn('host', 'string', 'keyword')]);
    const source = await EsqlSource.create({ query: 'FROM logs-* | KEEP host' });
    const legacyId = await getESQLAdHocDataviewId({
      indexPattern: 'logs-*',
      timeFieldName: undefined,
      projectRouting: undefined,
    });
    const legacy = await dataViews.create({
      id: legacyId,
      title: 'logs-*',
      type: ESQL_TYPE,
      fields: {
        host: { name: 'host', type: 'string', searchable: true, aggregatable: true },
        'host.raw': { name: 'host.raw', type: 'string', searchable: true, aggregatable: true },
      },
    });

    expect(await registerEsqlSourceInDataViewsCache(dataViews, source)).toBe(legacy);
  });

  it('retries the dataset schema when it could not be resolved', async () => {
    const dataViews = createMockDataViewsService();
    const first = await EsqlSource.create({ query: 'FROM retry-* | KEEP bytes' });
    const emptyDataView = await registerEsqlSourceInDataViewsCache(dataViews, first);
    expect(fieldNames(emptyDataView)).toEqual([]);

    // EsqlSource does not cache a failed LIMIT 0 lookup either.
    EsqlSource.clearCache();
    await seedDataset('retry-*');
    const second = await EsqlSource.create({ query: 'FROM retry-* | KEEP message' });
    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, second);

    expect(fieldNames(dataView)).toEqual(['@timestamp', 'bytes', 'message']);
  });
});

describe('getRegisteredEsqlDataView and getOrRegisterEsqlDataView', () => {
  beforeEach(() => EsqlSource.clearCache());

  it('returns the DataView registered for the source', async () => {
    const dataViews = createMockDataViewsService();
    const source = await EsqlSource.create({ query: 'FROM registered-*' });
    expect(getRegisteredEsqlDataView(source)).toBeUndefined();

    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);

    expect(getRegisteredEsqlDataView(source)).toBe(dataView);
  });

  it('does not register again when the source is already registered', async () => {
    const dataViews = createMockDataViewsService();
    const source = await EsqlSource.create({ query: 'FROM reused-*' });
    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);
    dataViews.create.mockClear();

    expect(await getOrRegisterEsqlDataView(dataViews, source)).toBe(dataView);
    expect(await getOrRegisterEsqlDataView(dataViews, source.withColumns([]))).toBe(dataView);
    expect(dataViews.create).not.toHaveBeenCalled();
  });

  it('registers when the source is not registered yet', async () => {
    const dataViews = createMockDataViewsService();
    const source = await EsqlSource.create({ query: 'FROM new-*' });

    const dataView = await getOrRegisterEsqlDataView(dataViews, source);

    expect(getRegisteredEsqlDataView(source)).toBe(dataView);
  });
});

describe('unregisterFromDataViewsCache', () => {
  beforeEach(() => EsqlSource.clearCache());

  it('forgets the source without dropping the DataView shared by its dataset', async () => {
    const dataViews = createMockDataViewsService();
    await seedDataset('unregister-*');
    const source = await EsqlSource.create({ query: 'FROM unregister-* | KEEP bytes' });
    const other = await EsqlSource.create({ query: 'FROM unregister-* | KEEP message' });
    const dataView = await registerEsqlSourceInDataViewsCache(dataViews, source);
    await registerEsqlSourceInDataViewsCache(dataViews, other);

    unregisterFromDataViewsCache(source.id);

    expect(getRegisteredEsqlDataView(source)).toBeUndefined();
    expect(getRegisteredEsqlDataView(other)).toBe(dataView);
    expect(await registerEsqlSourceInDataViewsCache(dataViews, other)).toBe(dataView);
  });
});
