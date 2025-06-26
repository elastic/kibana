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
    const expressionsExecuteSpy = jest.spyOn(discoverServiceMock.expressions, 'execute');
    expressionsExecuteSpy.mockReturnValueOnce({
      cancel: jest.fn(),
      getData: jest.fn(() =>
        of({
          result: {
            columns: ['_id', 'foo'],
            rows: hits,
          },
        })
      ),
    } as unknown as ExecutionContract);
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
