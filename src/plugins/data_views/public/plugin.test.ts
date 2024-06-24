/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { DataViewsPublicPlugin } from './plugin';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';

const mockInitializerContext = coreMock.createPluginInitializerContext();
const coreSetup = coreMock.createSetup();
const coreStart = coreMock.createStart();

const setupDeps = {
  expressions: expressionsPluginMock.createSetupContract(),
  fieldFormats: fieldFormatsServiceMock.createSetupContract(),
  contentManagement: contentManagementMock.createSetupContract(),
};
const startDeps = {
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  contentManagement: contentManagementMock.createStartContract(),
};

describe('DataViewsPublicPlugin', () => {
  test('setup contract', () => {
    const setup = new DataViewsPublicPlugin(mockInitializerContext).setup(coreSetup, setupDeps);
    expect(setup).toHaveProperty('enableRollups');
  });

  describe('userIdGetter', () => {
    class TestDataViewsPublicPlugin extends DataViewsPublicPlugin {
      constructor(...args: ConstructorParameters<typeof DataViewsPublicPlugin>) {
        super(...args);
      }

      public testUserIdGetter() {
        return this.userIdGetter();
      }
    }

    const mockUserProfileUid = '321-contact';
    let getCurrentUserMock: jest.SpyInstance;
    let plugin: TestDataViewsPublicPlugin;

    beforeEach(async () => {
      jest.spyOn(coreSetup, 'getStartServices').mockResolvedValue([coreStart, {}, {}]);
      getCurrentUserMock = jest
        .spyOn(coreStart.security.authc, 'getCurrentUser')
        .mockResolvedValueOnce({ profile_uid: mockUserProfileUid });

      plugin = new TestDataViewsPublicPlugin(mockInitializerContext);
      plugin.setup(coreSetup, setupDeps);
      plugin.start(coreStart, startDeps);
      await coreSetup.plugins.onStart();
    });

    test('uses core.security.authc API', async () => {
      const result = await plugin.testUserIdGetter();
      expect(result).toBe(mockUserProfileUid);
      expect(getCurrentUserMock).toBeCalledTimes(1);
    });
  });
});
