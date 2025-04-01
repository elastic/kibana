/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertItemsMock } from './driver.test.mocks';

import fetchMock from 'fetch-mock';
import { take } from 'rxjs';
import { NewsfeedApiDriver } from './driver';
import { storageMock } from './storage.mock';

const kibanaVersion = '8.0.0';
const userLanguage = 'en';
const fetchInterval = 2000;

describe('NewsfeedApiDriver', () => {
  let driver: NewsfeedApiDriver;
  let storage: ReturnType<typeof storageMock.create>;

  beforeEach(() => {
    storage = storageMock.create();
    driver = new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval, storage);
    convertItemsMock.mockReturnValue([]);
  });

  afterEach(() => {
    fetchMock.reset();
    convertItemsMock.mockReset();
  });

  afterAll(() => {
    fetchMock.restore();
  });

  describe('shouldFetch', () => {
    it('returns true if no value is present in the storage', () => {
      storage.getLastFetchTime.mockReturnValue(undefined);
      expect(driver.shouldFetch()).toBe(true);
      expect(storage.getLastFetchTime).toHaveBeenCalledTimes(1);
    });

    it('returns true if last fetch time precedes page load time', () => {
      storage.getLastFetchTime.mockReturnValue(new Date(Date.now() - 456789));
      expect(driver.shouldFetch()).toBe(true);
    });

    it('returns false if last fetch time is recent enough', () => {
      storage.getLastFetchTime.mockReturnValue(new Date(Date.now() + 745678));
      expect(driver.shouldFetch()).toBe(false);
    });
  });

  describe('fetchNewsfeedItems', () => {
    it('calls `window.fetch` with the correct parameters', async () => {
      fetchMock.get('*', { items: [] });
      await driver
        .fetchNewsfeedItems({
          urlRoot: 'http://newsfeed.com',
          pathTemplate: '/{VERSION}/news',
        })
        .pipe(take(1))
        .toPromise();

      expect(fetchMock.lastUrl()).toEqual('http://newsfeed.com/8.0.0/news');
      expect(fetchMock.lastOptions()).toMatchInlineSnapshot(`
        Object {
          "body": Promise {},
          "method": "GET",
        }
      `);
    });

    it('calls `convertItems` with the correct parameters', async () => {
      fetchMock.get('*', { items: ['foo', 'bar'] });

      await driver
        .fetchNewsfeedItems({
          urlRoot: 'http://newsfeed.com',
          pathTemplate: '/{VERSION}/news',
        })
        .pipe(take(1))
        .toPromise();

      expect(convertItemsMock).toHaveBeenCalledTimes(1);
      expect(convertItemsMock).toHaveBeenCalledWith(['foo', 'bar'], userLanguage);
    });

    it('calls `storage.setFetchedItems` with the correct parameters', async () => {
      fetchMock.get('*', { items: [] });
      convertItemsMock.mockReturnValue([
        { id: '1', hash: 'hash1' },
        { id: '2', hash: 'hash2' },
      ]);

      await driver
        .fetchNewsfeedItems({
          urlRoot: 'http://newsfeed.com',
          pathTemplate: '/{VERSION}/news',
        })
        .pipe(take(1))
        .toPromise();

      expect(storage.setFetchedItems).toHaveBeenCalledTimes(1);
      expect(storage.setFetchedItems).toHaveBeenCalledWith(['hash1', 'hash2']);
    });

    it('returns the expected values', async () => {
      fetchMock.get('*', { items: [] });
      const feedItems = [
        { id: '1', hash: 'hash1' },
        { id: '2', hash: 'hash2' },
      ];
      convertItemsMock.mockReturnValue(feedItems);
      storage.setFetchedItems.mockReturnValue(true);

      const result = await driver
        .fetchNewsfeedItems({
          urlRoot: 'http://newsfeed.com',
          pathTemplate: '/{VERSION}/news',
        })
        .pipe(take(1))
        .toPromise();

      expect(result).toEqual({
        error: null,
        kibanaVersion,
        hasNew: true,
        feedItems,
      });
    });
  });
});
