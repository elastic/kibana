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
import { fetchEsql } from './fetch_esql';

describe('fetchEsql', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    const resolveDocumentProfileSpy = jest.spyOn(
      discoverServiceMock.profilesManager,
      'resolveDocumentProfile'
    );
    expect(
      await fetchEsql({
        query: { esql: 'from *' },
        dataView: dataViewWithTimefieldMock,
        inspectorAdapters: { requests: new RequestAdapter() },
        data: discoverServiceMock.data,
        expressions: discoverServiceMock.expressions,
        profilesManager: discoverServiceMock.profilesManager,
      })
    ).toEqual({
      records,
      esqlQueryColumns: ['_id', 'foo'],
      esqlHeaderWarning: undefined,
    });
    expect(resolveDocumentProfileSpy).toHaveBeenCalledTimes(2);
    expect(resolveDocumentProfileSpy).toHaveBeenCalledWith({ record: records[0] });
    expect(resolveDocumentProfileSpy).toHaveBeenCalledWith({ record: records[1] });
  });
});
