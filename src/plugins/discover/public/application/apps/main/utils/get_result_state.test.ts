/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getResultState, resultStatuses } from './get_result_state';
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';
import { FetchStatus } from '../../../types';

describe('getResultState', () => {
  test('fetching uninitialized', () => {
    const actual = getResultState(FetchStatus.UNINITIALIZED, []);
    expect(actual).toBe(resultStatuses.UNINITIALIZED);
  });

  test('fetching complete with no records', () => {
    const actual = getResultState(FetchStatus.COMPLETE, []);
    expect(actual).toBe(resultStatuses.NO_RESULTS);
  });

  test('fetching ongoing aka loading', () => {
    const actual = getResultState(FetchStatus.LOADING, []);
    expect(actual).toBe(resultStatuses.LOADING);
  });

  test('fetching ready', () => {
    const record = ({ _id: 123 } as unknown) as ElasticSearchHit;
    const actual = getResultState(FetchStatus.COMPLETE, [record]);
    expect(actual).toBe(resultStatuses.READY);
  });

  test('re-fetching after already data is available', () => {
    const record = ({ _id: 123 } as unknown) as ElasticSearchHit;
    const actual = getResultState(FetchStatus.LOADING, [record]);
    expect(actual).toBe(resultStatuses.READY);
  });

  test('after a fetch error when data was successfully fetched before ', () => {
    const record = ({ _id: 123 } as unknown) as ElasticSearchHit;
    const actual = getResultState(FetchStatus.ERROR, [record]);
    expect(actual).toBe(resultStatuses.READY);
  });
});
