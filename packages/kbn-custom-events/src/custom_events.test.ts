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
});
