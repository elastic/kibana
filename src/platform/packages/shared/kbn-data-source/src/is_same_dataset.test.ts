/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewSource } from './sources/data_view_source';
import { EsqlSource } from './sources/esql_source';
import { isSameDataset } from './is_same_dataset';

function makeDataView(id: string): DataView {
  return {
    id,
    timeFieldName: undefined,
    getName: jest.fn(() => 'mock'),
    getIndexPattern: jest.fn(() => 'logs-*'),
    isPersisted: jest.fn(() => true),
    fields: {
      getAll: jest.fn(() => []),
      getByName: jest.fn(),
    },
  } as unknown as DataView;
}

describe('isSameDataset', () => {
  beforeEach(() => EsqlSource.clearCache());

  it('returns false when either source is missing', async () => {
    const source = await EsqlSource.create({
      query: 'FROM logs-*',
      resultColumns: [],
      timeFieldName: '@timestamp',
    });
    expect(isSameDataset(undefined, source)).toBe(false);
    expect(isSameDataset(source, undefined)).toBe(false);
    expect(isSameDataset(undefined, undefined)).toBe(false);
  });

  it('treats ES|QL sources with the same FROM and time field as the same dataset', async () => {
    const desc = await EsqlSource.create({
      query: 'FROM logs-* | SORT @timestamp DESC',
      resultColumns: [],
      timeFieldName: '@timestamp',
    });
    const asc = await EsqlSource.create({
      query: 'FROM logs-* | SORT @timestamp ASC',
      resultColumns: [],
      timeFieldName: '@timestamp',
    });
    expect(desc.id).not.toBe(asc.id);
    expect(isSameDataset(desc, asc)).toBe(true);
  });

  it('treats ES|QL sources with a different FROM as different datasets', async () => {
    const logs = await EsqlSource.create({
      query: 'FROM logs-*',
      resultColumns: [],
      timeFieldName: '@timestamp',
    });
    const metrics = await EsqlSource.create({
      query: 'FROM metrics-*',
      resultColumns: [],
      timeFieldName: '@timestamp',
    });
    expect(isSameDataset(logs, metrics)).toBe(false);
  });

  it('treats ES|QL sources with different projectRouting as different datasets', async () => {
    const projectA = await EsqlSource.create({
      query: 'FROM logs-*',
      resultColumns: [],
      timeFieldName: '@timestamp',
      projectRouting: 'project-a',
    });
    const projectB = await EsqlSource.create({
      query: 'FROM logs-*',
      resultColumns: [],
      timeFieldName: '@timestamp',
      projectRouting: 'project-b',
    });
    expect(isSameDataset(projectA, projectB)).toBe(false);
  });

  it('treats ES|QL sources with different SET project_routing as different datasets', async () => {
    const projectA = await EsqlSource.create({
      query: 'SET project_routing = "_alias:project-a"; FROM logs-*',
      resultColumns: [],
      timeFieldName: '@timestamp',
    });
    const projectB = await EsqlSource.create({
      query: 'SET project_routing = "_alias:project-b"; FROM logs-*',
      resultColumns: [],
      timeFieldName: '@timestamp',
    });
    expect(isSameDataset(projectA, projectB)).toBe(false);
  });

  it('treats SORT vs WHERE as the same dataset when routing matches', async () => {
    const sort = await EsqlSource.create({
      query: 'FROM logs-* | SORT @timestamp DESC',
      resultColumns: [],
      timeFieldName: '@timestamp',
      projectRouting: 'project-a',
    });
    const where = await EsqlSource.create({
      query: 'FROM logs-* | WHERE bytes > 0',
      resultColumns: [],
      timeFieldName: '@timestamp',
      projectRouting: 'project-a',
    });
    expect(sort.id).not.toBe(where.id);
    expect(isSameDataset(sort, where)).toBe(true);
  });

  it('compares Classic sources by id', () => {
    const a = new DataViewSource(makeDataView('dv-1'));
    const same = new DataViewSource(makeDataView('dv-1'));
    const other = new DataViewSource(makeDataView('dv-2'));
    expect(isSameDataset(a, same)).toBe(true);
    expect(isSameDataset(a, other)).toBe(false);
  });

  it('treats mixed ES|QL and Classic sources as different datasets', async () => {
    const esql = await EsqlSource.create({
      query: 'FROM logs-*',
      resultColumns: [],
      timeFieldName: '@timestamp',
    });
    const classic = new DataViewSource(makeDataView('dv-1'));
    expect(isSameDataset(esql, classic)).toBe(false);
  });
});
