/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { coreMock } from '@kbn/core/public/mocks';
import { SOURCES_TYPES, SOURCES_AUTOCOMPLETE_ROUTE } from '@kbn/esql-types';
import { getIndicesList } from './sources';

describe('getIndicesList', function () {
  it('should return also system indices with hidden flag on', async function () {
    const coreMockStartContract = coreMock.createStart();
    coreMockStartContract.http.get = jest.fn().mockResolvedValue([
      { name: '.system1', hidden: true, type: SOURCES_TYPES.INDEX },
      { name: 'logs', hidden: false, type: SOURCES_TYPES.INDEX },
    ]);

    const indices = await getIndicesList(coreMockStartContract, false);
    expect(indices).toStrictEqual([
      { name: '.system1', hidden: true, type: SOURCES_TYPES.INDEX },
      { name: 'logs', hidden: false, type: SOURCES_TYPES.INDEX },
    ]);

    expect(coreMockStartContract.http.get).toHaveBeenCalledWith(
      `${SOURCES_AUTOCOMPLETE_ROUTE}local`
    );
  });

  it('should mark the time_series indices correctly', async function () {
    const coreMockStartContract = coreMock.createStart();
    coreMockStartContract.http.get = jest.fn().mockResolvedValue([
      { name: 'logs', hidden: false, type: SOURCES_TYPES.TIMESERIES },
      { name: 'metrics', hidden: false, type: SOURCES_TYPES.INDEX },
    ]);

    const indices = await getIndicesList(coreMockStartContract, false);
    expect(indices).toStrictEqual([
      { name: 'logs', hidden: false, type: SOURCES_TYPES.TIMESERIES },
      { name: 'metrics', hidden: false, type: SOURCES_TYPES.INDEX },
    ]);
  });

  it('should type correctly the aliases', async function () {
    const coreMockStartContract = coreMock.createStart();
    coreMockStartContract.http.get = jest.fn().mockResolvedValue([
      { name: 'alias1', hidden: false, type: SOURCES_TYPES.ALIAS },
      { name: 'logs', hidden: false, type: SOURCES_TYPES.INDEX },
    ]);

    const indices = await getIndicesList(coreMockStartContract, false);
    expect(indices).toStrictEqual([
      { name: 'alias1', hidden: false, type: SOURCES_TYPES.ALIAS },
      { name: 'logs', hidden: false, type: SOURCES_TYPES.INDEX },
    ]);
  });
});

describe('getIndicesList with remote indices', function () {
  it('should include remote indices when areRemoteIndicesAvailable is true', async function () {
    const coreMockStartContract = coreMock.createStart();
    coreMockStartContract.http.get = jest.fn().mockResolvedValue([
      { name: 'remote:logs', hidden: false, type: SOURCES_TYPES.INDEX },
      { name: 'local-index', hidden: false, type: SOURCES_TYPES.INDEX },
    ]);

    const indices = await getIndicesList(coreMockStartContract, true);
    expect(indices).toStrictEqual([
      { name: 'remote:logs', hidden: false, type: SOURCES_TYPES.INDEX },
      { name: 'local-index', hidden: false, type: SOURCES_TYPES.INDEX },
    ]);

    expect(coreMockStartContract.http.get).toHaveBeenCalledWith(`${SOURCES_AUTOCOMPLETE_ROUTE}all`);
  });

  it('should not include remote indices when areRemoteIndicesAvailable is false', async function () {
    const coreMockStartContract = coreMock.createStart();
    coreMockStartContract.http.get = jest
      .fn()
      .mockResolvedValue([{ name: 'local-index', hidden: false, type: SOURCES_TYPES.INDEX }]);

    const indices = await getIndicesList(coreMockStartContract, false);
    expect(indices).toStrictEqual([
      { name: 'local-index', hidden: false, type: SOURCES_TYPES.INDEX },
    ]);

    expect(coreMockStartContract.http.get).toHaveBeenCalledWith(
      `${SOURCES_AUTOCOMPLETE_ROUTE}local`
    );
  });
});
