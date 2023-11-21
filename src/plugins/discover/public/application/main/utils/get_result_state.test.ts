/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getResultState, resultStatuses } from './get_result_state';
import { FetchStatus } from '../../types';

describe('getResultState', () => {
  test(`should return 'uninitialized' when fetching uninitialized`, () => {
    const actual = getResultState(FetchStatus.UNINITIALIZED, false);
    expect(actual).toBe(resultStatuses.UNINITIALIZED);
  });

  test(`should return 'loading' when fetching is loading`, () => {
    const actual = getResultState(FetchStatus.LOADING, false);
    expect(actual).toBe(resultStatuses.LOADING);
  });

  test(`should return 'none' when fetching is complete with no records`, () => {
    const actual = getResultState(FetchStatus.COMPLETE, false);
    expect(actual).toBe(resultStatuses.NO_RESULTS);
  });

  test(`should return 'none' after a fetch error`, () => {
    const actual = getResultState(FetchStatus.ERROR, false);
    expect(actual).toBe(resultStatuses.NO_RESULTS);
  });

  test(`should return 'ready' when fetching completes with records`, () => {
    const actual = getResultState(FetchStatus.COMPLETE, true);
    expect(actual).toBe(resultStatuses.READY);
  });

  test(`should reurn 'ready' when re-fetching after already data is available`, () => {
    const actual = getResultState(FetchStatus.LOADING, true);
    expect(actual).toBe(resultStatuses.READY);
  });

  test(`should return 'none' after a fetch error when data was successfully fetched before`, () => {
    const actual = getResultState(FetchStatus.ERROR, true);
    expect(actual).toBe(resultStatuses.NO_RESULTS);
  });
});
