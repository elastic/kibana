/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { DataView, isFilterable } from '@kbn/data-views-plugin/common';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { buildEsQuery, buildPhraseFilter } from '@kbn/es-query';
import type { DataViewFieldBase } from '@kbn/es-query';
import { registerEsqlSourceInDataViewsCache } from './cache_adapter';
import type { FilterableSource } from './filterable_source';
import { DataViewSource } from './sources/data_view_source';
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
  makeColumn('host', 'string', 'keyword'),
  makeColumn('message', 'string', 'text'),
];

/** Resolves the schema of `FROM <title>`, as the LIMIT 0 request would. */
const seedDataset = (title: string, timeFieldName?: string) =>
  EsqlSource.create({ query: `FROM ${title}`, timeFieldName, resultColumns: datasetColumns });

const statsOnDataset = async (title: string, timeFieldName?: string) => {
  await seedDataset(title, timeFieldName);
  return EsqlSource.create({
    query: `FROM ${title} | STATS avg_bytes = AVG(bytes) BY host`,
    timeFieldName,
    resultColumns: [
      makeColumn('avg_bytes', 'number', 'double', true),
      makeColumn('host', 'string'),
    ],
  });
};

const summarize = (fields: ArrayLike<DataViewFieldBase> & Iterable<DataViewFieldBase>) =>
  [...fields]
    .map((field) => {
      const { name, type, esTypes, searchable, aggregatable, isComputedColumn } =
        field as DataViewFieldBase & Partial<DataViewField>;
      return { name, type, esTypes, searchable, aggregatable, isComputedColumn };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

describe('toFilterableSource', () => {
  beforeEach(() => EsqlSource.clearCache());

  describe('EsqlSource', () => {
    it('has the dataset identity: the dataset id, the FROM target and the time field', async () => {
      const source = await statsOnDataset('ident-*', '@timestamp');

      const filterable = await source.toFilterableSource();

      expect(filterable.id).toBe(source.datasetId);
      expect(filterable.id).not.toBe(source.id);
      expect(filterable.title).toBe('ident-*');
      expect(filterable.timeFieldName).toBe('@timestamp');
      expect(filterable.isTimeBased()).toBe(true);
    });

    describe('sharing between queries on the same dataset', () => {
      const onDataset = (title: string, esql: string, timeFieldName = '@timestamp') =>
        EsqlSource.create({
          query: esql,
          timeFieldName,
          resultColumns: [makeColumn('avg_bytes', 'number', 'double', true)],
        }).then((source) => ({ source, title, timeFieldName }));

      it('returns the same object for queries on the same dataset, like the shared DataView', async () => {
        await seedDataset('shared-*', '@timestamp');
        const first = await onDataset('shared-*', 'FROM shared-* | STATS avg_bytes = AVG(bytes)');
        const second = await onDataset('shared-*', 'FROM shared-* | WHERE bytes > 10 | LIMIT 5');

        expect(first.source.id).not.toBe(second.source.id);
        expect(await second.source.toFilterableSource()).toBe(
          await first.source.toFilterableSource()
        );
      });

      it('returns another object for another dataset or time field', async () => {
        await seedDataset('one-*', '@timestamp');
        await seedDataset('two-*', '@timestamp');
        await seedDataset('one-*', 'event.ingested');
        const base = await onDataset('one-*', 'FROM one-* | LIMIT 1');
        const otherTarget = await onDataset('two-*', 'FROM two-* | LIMIT 1');
        const otherTime = await onDataset('one-*', 'FROM one-* | LIMIT 1', 'event.ingested');

        const filterable = await base.source.toFilterableSource();

        expect(await otherTarget.source.toFilterableSource()).not.toBe(filterable);
        expect(await otherTime.source.toFilterableSource()).not.toBe(filterable);
      });
    });

    it('has the name of the source, and no getName, which is an optional capability', async () => {
      const source = await statsOnDataset('named-*');

      const filterable = await source.toFilterableSource();

      expect(filterable.name).toBe(source.name);
      expect('getName' in filterable).toBe(false);
    });

    it('is not time based without a time field', async () => {
      const source = await statsOnDataset('no-time-*');

      expect((await source.toFilterableSource()).isTimeBased()).toBe(false);
    });

    it('has the fields of the FROM target, not the result columns of the query', async () => {
      const source = await statsOnDataset('fields-*', '@timestamp');

      const { fields } = await source.toFilterableSource();

      expect(fields.map(({ name }) => name).sort()).toEqual([
        '@timestamp',
        'bytes',
        'host',
        'message',
      ]);
    });

    it('adds the time field when the schema of the dataset lacks it', async () => {
      await EsqlSource.create({
        query: 'FROM lacks-time-*',
        resultColumns: [makeColumn('bytes', 'number', 'long')],
      });
      const source = await EsqlSource.create({
        query: 'FROM lacks-time-* | KEEP bytes',
        timeFieldName: 'event.ingested',
      });

      const { fields } = await source.toFilterableSource();

      expect(fields.find(({ name }) => name === 'event.ingested')).toEqual(
        expect.objectContaining({ type: 'date', esTypes: ['date'] })
      );
    });

    it('has no fields while the schema of the dataset is unknown', async () => {
      const source = await EsqlSource.create({ query: 'FROM unknown-*' });

      expect((await source.toFilterableSource()).fields).toEqual([]);
    });

    it('does not provide a formatter, which is optional for the pill display helpers', async () => {
      const source = await statsOnDataset('formatter-*');

      expect('getFormatterForField' in (await source.toFilterableSource())).toBe(false);
    });

    describe('parity with the DataView registered for the dataset', () => {
      it('has the same id, title, time field and fields', async () => {
        const source = await statsOnDataset('parity-*', '@timestamp');
        const dataView = await registerEsqlSourceInDataViewsCache(
          createMockDataViewsService(),
          source
        );

        const filterable = await source.toFilterableSource();

        expect(filterable.id).toBe(dataView.id);
        expect(filterable.title).toBe(dataView.title);
        expect(filterable.timeFieldName).toBe(dataView.timeFieldName);
        expect(summarize(filterable.fields)).toEqual(summarize(dataView.fields.getAll()));
      });

      it('sets filterable on each field, as the DataView field reports it', async () => {
        const source = await statsOnDataset('filterable-flag-*', '@timestamp');
        const dataView = await registerEsqlSourceInDataViewsCache(
          createMockDataViewsService(),
          source
        );

        const { fields } = await source.toFilterableSource();

        expect(fields.length).toBeGreaterThan(0);
        fields.forEach(({ name, filterable }) => {
          expect(filterable).toBe(dataView.fields.getByName(name)?.filterable);
        });
      });

      it('has the same fields that unified search offers to filter on', async () => {
        const source = await statsOnDataset('filterable-*', '@timestamp');
        const dataView = await registerEsqlSourceInDataViewsCache(
          createMockDataViewsService(),
          source
        );

        const { fields } = await source.toFilterableSource();

        const names = (list: unknown[]) =>
          (list as DataViewField[]).filter(isFilterable).map(({ name }) => name);
        expect(names(fields)).toEqual(names(dataView.fields.getAll()));
        expect(names(fields)).toContain('message');
      });

      it('builds the same query from a filter as the DataView does', async () => {
        const source = await statsOnDataset('query-*', '@timestamp');
        const dataView = await registerEsqlSourceInDataViewsCache(
          createMockDataViewsService(),
          source
        );
        const filterable = await source.toFilterableSource();
        const toQuery = (target: FilterableSource | DataView) => {
          const field = target.fields.find(({ name }) => name === 'host')!;
          const filter = buildPhraseFilter(field, 'web-01', target);
          return buildEsQuery(target, [], [filter]);
        };

        expect(toQuery(filterable)).toEqual(toQuery(dataView));
      });
    });
  });

  describe('DataViewSource', () => {
    it('returns the DataView itself, so DSL consumers see no difference', async () => {
      const dataView = new DataView({
        spec: { id: 'dsl-id', title: 'logs-*', timeFieldName: '@timestamp', fields: {} },
        fieldFormats: {} as DataView['fieldFormats'],
      });

      const filterable = await new DataViewSource(dataView).toFilterableSource();

      expect(filterable).toBe(dataView);
    });
  });
});
