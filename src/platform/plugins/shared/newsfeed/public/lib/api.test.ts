/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { driverInstanceMock, storageInstanceMock } from './api.test.mocks';

import moment from 'moment';
import { getApi } from './api';
import { TestScheduler } from 'rxjs/testing';
import { FetchResult, NewsfeedPluginBrowserConfig } from '../types';
import { take } from 'rxjs';

import { NewsfeedApiDriver as MockNewsfeedApiDriver } from './driver';
import { NeverFetchNewsfeedApiDriver as MockNeverFetchNewsfeedApiDriver } from './never_fetch_driver';

const kibanaVersion = '8.0.0';
const newsfeedId = 'test';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

const createConfig = (mainInternal: number): NewsfeedPluginBrowserConfig => ({
  mainInterval: moment.duration(mainInternal, 'ms'),
  fetchInterval: moment.duration(mainInternal, 'ms'),
  service: {
    urlRoot: 'urlRoot',
    pathTemplate: 'pathTemplate',
  },
});

const createFetchResult = (parts: Partial<FetchResult>): FetchResult => ({
  feedItems: [],
  hasNew: false,
  error: null,
  kibanaVersion,
  ...parts,
});

describe('getApi', () => {
  beforeEach(() => {
    driverInstanceMock.shouldFetch.mockReturnValue(true);
  });

  afterEach(() => {
    storageInstanceMock.isAnyUnread$.mockReset();
    driverInstanceMock.fetchNewsfeedItems.mockReset();
    (MockNewsfeedApiDriver as jest.Mock).mockClear();
    (MockNeverFetchNewsfeedApiDriver as jest.Mock).mockClear();
  });

  it('merges the newsfeed and unread observables', () => {
    getTestScheduler().run(({ expectObservable, cold }) => {
      storageInstanceMock.isAnyUnread$.mockImplementation(() => {
        return cold<boolean>('a|', {
          a: true,
        });
      });
      driverInstanceMock.fetchNewsfeedItems.mockReturnValue(
        cold<FetchResult>('a|', {
          a: createFetchResult({ feedItems: ['item' as any] }),
        })
      );
      const api = getApi(createConfig(1000), kibanaVersion, newsfeedId, false);

      expectObservable(api.fetchResults$.pipe(take(1))).toBe('(a|)', {
        a: createFetchResult({
          feedItems: ['item' as any],
          hasNew: true,
        }),
      });
    });
  });

  it('emits based on the predefined interval', () => {
    getTestScheduler().run(({ expectObservable, cold }) => {
      storageInstanceMock.isAnyUnread$.mockImplementation(() => {
        return cold<boolean>('a|', {
          a: true,
        });
      });
      driverInstanceMock.fetchNewsfeedItems.mockReturnValue(
        cold<FetchResult>('a|', {
          a: createFetchResult({ feedItems: ['item' as any] }),
        })
      );
      const api = getApi(createConfig(2), kibanaVersion, newsfeedId, false);

      expectObservable(api.fetchResults$.pipe(take(2))).toBe('a-(b|)', {
        a: createFetchResult({
          feedItems: ['item' as any],
          hasNew: true,
        }),
        b: createFetchResult({
          feedItems: ['item' as any],
          hasNew: true,
        }),
      });
    });
  });

  it('re-emits when the unread status changes', () => {
    getTestScheduler().run(({ expectObservable, cold }) => {
      storageInstanceMock.isAnyUnread$.mockImplementation(() => {
        return cold<boolean>('a--b', {
          a: true,
          b: false,
        });
      });
      driverInstanceMock.fetchNewsfeedItems.mockReturnValue(
        cold<FetchResult>('(a|)', {
          a: createFetchResult({}),
        })
      );
      const api = getApi(createConfig(10), kibanaVersion, newsfeedId, false);

      expectObservable(api.fetchResults$.pipe(take(2))).toBe('a--(b|)', {
        a: createFetchResult({
          hasNew: true,
        }),
        b: createFetchResult({
          hasNew: false,
        }),
      });
    });
  });

  it('uses the news feed API driver if in not screenshot mode', () => {
    getApi(createConfig(10), kibanaVersion, newsfeedId, false);
    expect(MockNewsfeedApiDriver).toHaveBeenCalled();
    expect(MockNeverFetchNewsfeedApiDriver).not.toHaveBeenCalled();
  });

  it('uses the never fetch news feed API driver if in not screenshot mode', () => {
    getApi(createConfig(10), kibanaVersion, newsfeedId, true);
    expect(MockNewsfeedApiDriver).not.toHaveBeenCalled();
    expect(MockNeverFetchNewsfeedApiDriver).toHaveBeenCalled();
  });
});
