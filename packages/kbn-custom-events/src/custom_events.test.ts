/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomEvents } from './custom_events';
import { sha256 } from 'js-sha256';
import { FullStoryApi, FullStoryDeps, FullStoryService } from './fullstory';
import { PackageInfo } from '@kbn/config';

export const fullStoryApiMock: jest.Mocked<FullStoryApi> = {
  event: jest.fn(),
  setUserVars: jest.fn(),
  identify: jest.fn(),
};

export const initializeFullStoryMock = jest.fn<FullStoryService, [FullStoryDeps]>(() => ({
  fullStory: fullStoryApiMock,
  sha256,
}));

jest.doMock('./fullstory', () => {
  return { initializeFullStory: initializeFullStoryMock };
});

describe('custom-events', () => {
  let customEvents: CustomEvents;
  const fullstoryOrgId = '12344';
  const esOrgId: string = '444';
  const userId: string = '4312';
  const packageInfo: PackageInfo = {
    version: '7.14.5',
    buildNum: 123,
    branch: '',
    buildSha: '123',
    dist: false,
  };
  beforeEach(() => {
    customEvents = new CustomEvents();
    fullStoryApiMock.identify.mockReset();
  });

  describe('no-fullstory', () => {
    test('disabled', async () => {
      const userIdPromise = new Promise<string>((resolve) => {
        resolve(userId);
      });
      const res = await customEvents.initialize({
        enabled: false,
        fullstoryOrgId,
        esOrgId,
        basePath: '',
        packageInfo,
        userIdPromise,
      });
      expect(initializeFullStoryMock).not.toHaveBeenCalled();
      expect(res).toBe(false);
    });

    test('not on cloud', async () => {
      const userIdPromise = new Promise<string>((resolve) => {
        resolve(userId);
      });
      const res = await customEvents.initialize({
        enabled: true,
        fullstoryOrgId: undefined,
        esOrgId,
        basePath: '',
        packageInfo,
        userIdPromise,
      });
      expect(initializeFullStoryMock).not.toHaveBeenCalled();
      expect(res).toBe(false);
    });

    test('when user id promise throws', async () => {
      const userIdPromise = new Promise<string>((_, reject) => {
        reject();
      });
      const res = await customEvents.initialize({
        enabled: true,
        fullstoryOrgId,
        esOrgId,
        basePath: '',
        packageInfo,
        userIdPromise,
      });
      expect(res).toBe(false);
      expect(initializeFullStoryMock).not.toHaveBeenCalled();
    });
  });

  describe('with fullstory', () => {
    test('initialized correctly with user id', async () => {
      const userIdPromise = new Promise<string>((resolve) => {
        resolve(userId);
      });
      const res = await customEvents.initialize({
        enabled: true,
        fullstoryOrgId,
        esOrgId,
        basePath: '',
        packageInfo,
        userIdPromise,
      });
      expect(res).toBe(true);
      expect(initializeFullStoryMock).toHaveBeenCalledWith({
        basePath: '',
        orgId: fullstoryOrgId,
        packageInfo,
      });

      /* eslint-disable @typescript-eslint/naming-convention */
      expect(fullStoryApiMock.identify).toHaveBeenCalledWith(sha256(`${esOrgId}:${userId}`), {
        esOrgId_str: esOrgId,
        versionMajor_int: 7,
        versionMinor_int: 14,
        versionPatch_int: 5,
        version_str: packageInfo.version,
      });
      /* eslint-enable @typescript-eslint/naming-convention */
    });

    test('initialized correctly with user id but without es org id', async () => {
      const userIdPromise = new Promise<string>((resolve) => {
        resolve(userId);
      });
      const res = await customEvents.initialize({
        enabled: true,
        fullstoryOrgId,
        esOrgId: undefined,
        basePath: '',
        packageInfo,
        userIdPromise,
      });
      expect(res).toBe(true);
      expect(initializeFullStoryMock).toHaveBeenCalledWith({
        basePath: '',
        orgId: fullstoryOrgId,
        packageInfo,
      });

      /* eslint-disable @typescript-eslint/naming-convention */
      expect(fullStoryApiMock.identify).toHaveBeenCalledWith(sha256(`${userId}`), {
        versionMajor_int: 7,
        versionMinor_int: 14,
        versionPatch_int: 5,
        version_str: packageInfo.version,
      });
      /* eslint-enable @typescript-eslint/naming-convention */
    });
  });

  describe('fullstory arg formatting', () => {
    beforeEach(async () => {
      const userIdPromise = new Promise<string>((resolve) => {
        resolve(userId);
      });
      await customEvents.initialize({
        enabled: true,
        fullstoryOrgId,
        esOrgId,
        basePath: '',
        packageInfo,
        userIdPromise,
      });

      fullStoryApiMock.setUserVars.mockReset();
    });

    test('works for undefined', () => {
      customEvents.setUserContext({
        param: undefined,
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        param: undefined,
      });
    });

    test('works for a string', () => {
      customEvents.setUserContext({
        test: 'abc',
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_str: 'abc',
      });
    });

    test('works for a snake case param', () => {
      customEvents.setUserContext({
        my_test: 'abc',
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        my_test_str: 'abc',
      });
    });

    test('works for a camel case param', () => {
      customEvents.setUserContext({
        myTest: 'abc',
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        myTest_str: 'abc',
      });
    });

    test('works for a string array', () => {
      customEvents.setUserContext({
        test: ['abc', 'cde'],
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_strs: ['abc', 'cde'],
      });
    });

    test('works for a bool', () => {
      customEvents.setUserContext({
        test: true,
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_bool: true,
      });
    });

    test('works for a bool array', () => {
      customEvents.setUserContext({
        test: [true, false],
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_bools: [true, false],
      });
    });

    test('works for an integer', () => {
      customEvents.setUserContext({
        test: 0,
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_int: 0,
      });

      customEvents.setUserContext({
        test: 1,
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_int: 1,
      });

      customEvents.setUserContext({
        test: -1,
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_int: -1,
      });
    });

    test('works for a integer array', () => {
      customEvents.setUserContext({
        test: [1, 2],
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_ints: [1, 2],
      });
    });

    test('works for a NaN', () => {
      customEvents.setUserContext({
        test: NaN,
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_real: NaN,
      });
    });

    test('works for a float', () => {
      customEvents.setUserContext({
        test: 0.1,
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_real: 0.1,
      });

      customEvents.setUserContext({
        test: -1 / 3,
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_real: -1 / 3,
      });
    });

    test('works for a real array', () => {
      customEvents.setUserContext({
        test: [1.2, 2.1],
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_reals: [1.2, 2.1],
      });
    });

    test('takes the type from the first item in the array', () => {
      customEvents.setUserContext({
        test: ['say', 2.1],
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        test_strs: ['say', 2.1],
      });
    });

    test('works for a date', () => {
      const date = new Date();
      customEvents.setUserContext({
        mydate: date,
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        mydate_date: date,
      });
    });

    test('works for a date array', () => {
      const dates = [new Date(), new Date()];
      customEvents.setUserContext({
        mydate: dates,
      });

      expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
        mydate_dates: dates,
      });
    });

    test.skip('works for a object  object array', () => {
      // objects are currently excluded by typescript types, to simplify the implementation
    });
  });
});
