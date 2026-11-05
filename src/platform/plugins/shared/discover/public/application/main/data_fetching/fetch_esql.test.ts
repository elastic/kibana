/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { getDocId, type EsHitRecord } from '@kbn/discover-utils';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import moment from 'moment';
import { discoverServiceMock } from '../../../__mocks__/services';
import { fetchEsql } from './fetch_esql';
import type { TimeRange } from '@kbn/es-query';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../context_awareness';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';

describe('fetchEsql', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const scopedProfilesManager = discoverServiceMock.profilesManager.createScopedProfilesManager({
    scopedEbtManager: discoverServiceMock.ebtManager.createScopedEBTManager(),
    toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  });
  const mockEsqlSource = createMockEsqlSource([], [], '@timestamp');
  const fetchEsqlMockProps = {
    query: { esql: 'from *' },
    esqlSource: mockEsqlSource,
    inspectorAdapters: { requests: new RequestAdapter() },
    data: discoverServiceMock.data,
    scopedProfilesManager,
    esqlApproximation: false,
  };

  const toColumns = (names: string[]) =>
    names.map((name) => ({ id: name, name, meta: { type: 'string' as const } }));

  const mockEsqlResult = (names: string[], rows: unknown[]) =>
    jest.mocked(discoverServiceMock.data.search.esql).mockResolvedValueOnce({
      rawResponse: { columns: [], values: [] },
      datatable: { type: 'datatable', columns: toColumns(names), rows },
    } as unknown as Awaited<ReturnType<typeof discoverServiceMock.data.search.esql>>);

  it('resolves with returned records', async () => {
    const hits = [
      { _index: 'i', _id: '1', foo: 'bar' },
      { _index: 'i', _id: '2', foo: 'baz' },
    ] as unknown as EsHitRecord[];
    const records = hits.map((hit) => ({
      id: getDocId(hit),
      raw: hit,
      flattened: hit,
    }));
    mockEsqlResult(['_id', 'foo'], hits);
    const resolveDocumentProfileSpy = jest.spyOn(scopedProfilesManager, 'resolveDocumentProfile');
    const result = await fetchEsql(fetchEsqlMockProps);
    expect(result.records).toEqual(records);
    expect(result.dataSource?.resultColumns).toEqual(toColumns(['_id', 'foo']));
    expect(result.esqlHeaderWarning).toBeUndefined();
    expect(result.interceptedWarnings).toEqual([]);
    expect(result.approximationApplied).toBeUndefined();
    expect(resolveDocumentProfileSpy).toHaveBeenCalledTimes(2);
    expect(resolveDocumentProfileSpy).toHaveBeenCalledWith({ record: records[0] });
    expect(resolveDocumentProfileSpy).toHaveBeenCalledWith({ record: records[1] });
  });

  it('falls back to generated ids when row metadata is missing', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 7, 22, 34, 46));

    try {
      const hits = [
        { _id: '1', foo: 'bar' },
        { _id: '2', foo: 'baz' },
      ] as unknown as EsHitRecord[];
      const responseTime = moment().format('YYYY-MM-DD_HH_mm_ss');
      mockEsqlResult(['_id', 'foo'], hits);

      const result = await fetchEsql(fetchEsqlMockProps);
      expect(result.records).toEqual([
        {
          id: `1@${responseTime}`,
          raw: hits[0],
          flattened: hits[0],
        },
        {
          id: `2@${responseTime}`,
          raw: hits[1],
          flattened: hits[1],
        },
      ]);
      expect(result.dataSource?.resultColumns).toEqual(toColumns(['_id', 'foo']));
      expect(result.esqlHeaderWarning).toBeUndefined();
      expect(result.interceptedWarnings).toEqual([]);
      expect(result.approximationApplied).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('should generate identical stable ids across two fetches when _id and _index are present', async () => {
    jest.useFakeTimers();

    try {
      const hits = [
        { _index: 'i', _id: '1', foo: 'bar' },
        { _index: 'i', _id: '2', foo: 'baz' },
      ] as unknown as EsHitRecord[];

      const mockExecute = () => mockEsqlResult(['_id', '_index', 'foo'], hits);

      jest.setSystemTime(new Date(2026, 4, 7, 22, 34, 46));
      mockExecute();
      const { records: firstFetch } = await fetchEsql(fetchEsqlMockProps);

      // Advance time to simulate a later refresh
      jest.setSystemTime(new Date(2026, 4, 7, 22, 34, 47));
      mockExecute();
      const { records: secondFetch } = await fetchEsql(fetchEsqlMockProps);

      expect(firstFetch[0].id).toBe(secondFetch[0].id);
      expect(firstFetch[1].id).toBe(secondFetch[1].id);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should generate different ids across two fetches when _index is absent', async () => {
    jest.useFakeTimers();

    try {
      const hits = [{ _id: '1', foo: 'bar' }] as unknown as EsHitRecord[];

      const mockExecute = () => mockEsqlResult(['_id', 'foo'], hits);

      jest.setSystemTime(new Date(2026, 4, 7, 22, 34, 46));
      mockExecute();
      const { records: firstFetch } = await fetchEsql(fetchEsqlMockProps);

      // Advance time to simulate a later refresh
      jest.setSystemTime(new Date(2026, 4, 7, 22, 34, 47));
      mockExecute();
      const { records: secondFetch } = await fetchEsql(fetchEsqlMockProps);

      expect(firstFetch[0].id).not.toBe(secondFetch[0].id);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should use inputTimeRange if provided', async () => {
    const timeRange: TimeRange = { from: 'now-15m', to: 'now' };
    mockEsqlResult([], []);
    await fetchEsql({ ...fetchEsqlMockProps, timeRange });
    expect(discoverServiceMock.data.search.esql).toHaveBeenCalledWith(
      expect.objectContaining({
        kibanaQueryContext: expect.objectContaining({ timeRange, timeField: '@timestamp' }),
      }),
      expect.anything()
    );
  });

  it('should use absolute time from data if inputTimeRange is not provided', async () => {
    const absoluteTimeRange: TimeRange = {
      from: '2021-08-31T22:00:00.000Z',
      to: '2021-09-01T22:00:00.000Z',
    };
    jest
      .spyOn(discoverServiceMock.data.query.timefilter.timefilter, 'getAbsoluteTime')
      .mockReturnValue(absoluteTimeRange);
    mockEsqlResult([], []);

    await fetchEsql(fetchEsqlMockProps);

    expect(discoverServiceMock.data.search.esql).toHaveBeenCalledWith(
      expect.objectContaining({
        kibanaQueryContext: expect.objectContaining({ timeRange: absoluteTimeRange }),
      }),
      expect.anything()
    );
  });

  it('passes the Kibana locale to the search method', async () => {
    mockEsqlResult([], []);

    await fetchEsql(fetchEsqlMockProps);

    expect(discoverServiceMock.data.search.esql).toHaveBeenCalledWith(
      expect.objectContaining({ locale: i18n.getLocale() }),
      expect.anything()
    );
  });

  it('passes esqlApproximation to the search method', async () => {
    mockEsqlResult([], []);

    await fetchEsql({ ...fetchEsqlMockProps, esqlApproximation: true });

    expect(discoverServiceMock.data.search.esql).toHaveBeenCalledWith(
      expect.objectContaining({ approximation: true }),
      expect.anything()
    );
  });

  it('uses the default inspector title and description unless overridden', async () => {
    mockEsqlResult([], []);
    await fetchEsql(fetchEsqlMockProps);
    expect(discoverServiceMock.data.search.esql).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        inspector: expect.objectContaining({ title: 'Table' }),
      })
    );

    mockEsqlResult([], []);
    await fetchEsql({
      ...fetchEsqlMockProps,
      inspectorConfig: { title: 'Custom', description: 'Custom description' },
    });
    expect(discoverServiceMock.data.search.esql).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        inspector: expect.objectContaining({ title: 'Custom', description: 'Custom description' }),
      })
    );
  });

  it('rethrows search errors', async () => {
    jest.mocked(discoverServiceMock.data.search.esql).mockRejectedValueOnce(new Error('boom'));
    await expect(fetchEsql(fetchEsqlMockProps)).rejects.toThrow('boom');
  });

  it('returns no records for non-ES|QL queries without searching', async () => {
    const result = await fetchEsql({
      ...fetchEsqlMockProps,
      query: { query: '', language: 'kuery' },
    });
    expect(result.records).toEqual([]);
    expect(discoverServiceMock.data.search.esql).not.toHaveBeenCalled();
  });

  it('should add inline_highlights to the raw record when inline highlights are present', async () => {
    const hits = [
      { _index: 'i', _id: '1', snippets: '<em>bar</em>' },
      { _index: 'i', _id: '2', snippets: '<em>baz</em>' },
    ] as unknown as EsHitRecord[];
    mockEsqlResult(['_id', 'snippets'], hits);

    const result = await fetchEsql({
      ...fetchEsqlMockProps,
      query: { esql: 'from * | EVAL snippets = TOP_SNIPPETS(foo, "bar", { "highlight": true })' },
    });

    expect(result.records[0].raw.inline_highlights).toEqual({
      snippets: { preTag: '<em>', postTag: '</em>' },
    });
    expect(result.records[1].raw.inline_highlights).toEqual({
      snippets: { preTag: '<em>', postTag: '</em>' },
    });
  });

  it('should add inline_highlights for HIGHLIGHT command columns', async () => {
    const hits = [
      { _index: 'i', _id: '1', highlight_title: '<em>bar</em>' },
      { _index: 'i', _id: '2', highlight_title: '<em>baz</em>' },
    ] as unknown as EsHitRecord[];
    mockEsqlResult(['_id', 'highlight_title'], hits);

    const result = await fetchEsql({
      ...fetchEsqlMockProps,
      query: { esql: 'from * | HIGHLIGHT "bar" ON title' },
    });

    expect(result.records[0].raw.inline_highlights).toEqual({
      highlight_title: { preTag: '<em>', postTag: '</em>' },
    });
    expect(result.records[1].raw.inline_highlights).toEqual({
      highlight_title: { preTag: '<em>', postTag: '</em>' },
    });
  });
});
