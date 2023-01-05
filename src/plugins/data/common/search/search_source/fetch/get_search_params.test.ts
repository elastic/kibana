/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UI_SETTINGS } from '../../../constants';
import { GetConfigFn } from '../../../types';
import { getSearchParams, getSearchParamsFromRequest } from './get_search_params';

function getConfigStub(config: any = {}): GetConfigFn {
  return (key) => config[key];
}

describe('getSearchParams', () => {
  test('includes custom preference', () => {
    const config = getConfigStub({
      [UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE]: 'custom',
      [UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE]: 'aaa',
    });
    const searchParams = getSearchParams(config);
    expect(searchParams.preference).toBe('aaa');
  });

  test('extracts track total hits', () => {
    const getConfig = getConfigStub({
      [UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE]: 'custom',
      [UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE]: 'aaa',
    });
    const searchParams = getSearchParamsFromRequest(
      {
        index: 'abc',
        body: {
          query: 123,
          track_total_hits: true,
        },
      },
      { getConfig }
    );
    expect(searchParams.index).toBe('abc');
    // @ts-expect-error `track_total_hits` not allowed at top level for `typesWithBodyKey`
    expect(searchParams.track_total_hits).toBe(true);
    expect(searchParams.body).toStrictEqual({
      query: 123,
    });
  });
});
