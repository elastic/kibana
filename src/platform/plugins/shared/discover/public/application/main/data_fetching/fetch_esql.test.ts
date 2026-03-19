/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsHitRecord } from '@kbn/discover-utils';
import type { ExecutionContract } from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { of } from 'rxjs';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { discoverServiceMock } from '../../../__mocks__/services';
import { fetchEsql, getTextBasedQueryStateToAstProps } from './fetch_esql';
import type { TimeRange } from '@kbn/es-query';

describe('fetchEsql', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const scopedProfilesManager = discoverServiceMock.profilesManager.createScopedProfilesManager({
    scopedEbtManager: discoverServiceMock.ebtManager.createScopedEBTManager(),
  });
  const fetchEsqlMockProps = {
    query: { esql: 'from *' },
    dataView: dataViewWithTimefieldMock,
    inspectorAdapters: { requests: new RequestAdapter() },
    data: discoverServiceMock.data,
    expressions: discoverServiceMock.expressions,
    scopedProfilesManager,
  };

  const mockExpressionResult = (columns: unknown[], rows: unknown[]) => {
    jest.spyOn(discoverServiceMock.expressions, 'execute').mockReturnValueOnce({
      cancel: jest.fn(),
      getData: jest.fn(() => of({ result: { columns, rows } })),
    } as unknown as ExecutionContract);
  };

  const col = (id: string, type = 'keyword') => ({ id, name: id, meta: { type } });

  it('resolves with returned records', async () => {
    const hits = [
      { _id: '1', foo: 'bar' },
      { _id: '2', foo: 'baz' },
    ] as unknown as EsHitRecord[];
    const records = hits.map((hit, i) => ({
      id: String(i),
      raw: hit,
      flattened: hit,
    }));
    mockExpressionResult(['_id', 'foo'], hits);
    const resolveDocumentProfileSpy = jest.spyOn(scopedProfilesManager, 'resolveDocumentProfile');
    expect(await fetchEsql(fetchEsqlMockProps)).toEqual({
      records,
      esqlQueryColumns: ['_id', 'foo'],
      esqlHeaderWarning: undefined,
      interceptedWarnings: [],
    });
    expect(resolveDocumentProfileSpy).toHaveBeenCalledTimes(2);
    expect(resolveDocumentProfileSpy).toHaveBeenCalledWith({ record: records[0] });
    expect(resolveDocumentProfileSpy).toHaveBeenCalledWith({ record: records[1] });
  });

  it('should filter injected metadata columns from esqlQueryColumns but keep them in row data', async () => {
    const hits = [
      { _id: 'doc1', _index: 'logs-1', message: 'hello' },
      { _id: 'doc2', _index: 'logs-1', message: 'world' },
    ] as unknown as EsHitRecord[];
    mockExpressionResult([col('_id'), col('_index'), col('message')], hits);
    const result = await fetchEsql(fetchEsqlMockProps);
    expect(result.esqlQueryColumns).toEqual([col('message')]);
    expect(result.records[0].raw).toHaveProperty('_id', 'doc1');
    expect(result.records[0].raw).toHaveProperty('_index', 'logs-1');
  });

  it('should not filter metadata columns that the user explicitly requested', async () => {
    const hits = [{ _id: 'doc1', message: 'hello' }] as unknown as EsHitRecord[];
    mockExpressionResult([col('_id'), col('message')], hits);
    const result = await fetchEsql({
      ...fetchEsqlMockProps,
      query: { esql: 'from * metadata _id' },
    });
    expect(result.esqlQueryColumns).toEqual([col('_id'), col('message')]);
  });

  it('should use inputTimeRange if provided', () => {
    const timeRange: TimeRange = { from: 'now-15m', to: 'now' };
    const result = getTextBasedQueryStateToAstProps({ ...fetchEsqlMockProps, timeRange });
    expect(result.time).toEqual(timeRange);
  });

  it('should use absolute time from data if inputTimeRange is not provided', () => {
    const absoluteTimeRange: TimeRange = {
      from: '2021-08-31T22:00:00.000Z',
      to: '2021-09-01T22:00:00.000Z',
    };
    jest
      .spyOn(discoverServiceMock.data.query.timefilter.timefilter, 'getAbsoluteTime')
      .mockReturnValue(absoluteTimeRange);

    const result = getTextBasedQueryStateToAstProps(fetchEsqlMockProps);

    expect(result.time).toEqual(absoluteTimeRange);
  });
});
