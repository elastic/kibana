/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
});
