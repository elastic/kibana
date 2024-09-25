/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { taggingApiMock } from './api.mock';
import { SavedObjectTaggingOssPlugin } from './plugin';

describe('SavedObjectTaggingOssPlugin', () => {
  let plugin: SavedObjectTaggingOssPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    coreSetup = coreMock.createSetup();
    plugin = new SavedObjectTaggingOssPlugin(coreMock.createPluginInitializerContext());
  });

  describe('#start', () => {
    let coreStart: ReturnType<typeof coreMock.createStart>;

    // need to wait for api promises to resolve
    const nextTick = () =>
      new Promise((resolve) => {
        window.setTimeout(resolve, 0);
      });

    beforeEach(() => {
      coreStart = coreMock.createStart();
    });

    it('returns the tagging API if registered', async () => {
      const taggingApi = taggingApiMock.create();
      const { registerTaggingApi } = plugin.setup(coreSetup);

      registerTaggingApi(Promise.resolve(taggingApi));

      await nextTick();

      const { getTaggingApi, isTaggingAvailable } = plugin.start(coreStart);

      expect(isTaggingAvailable()).toBe(true);
      expect(getTaggingApi()).toStrictEqual(taggingApi);
    });
    it('does not return the tagging API if not registered', async () => {
      plugin.setup(coreSetup);

      await nextTick();

      const { getTaggingApi, isTaggingAvailable } = plugin.start(coreStart);

      expect(isTaggingAvailable()).toBe(false);
      expect(getTaggingApi()).toBeUndefined();
    });
    it('does not return the tagging API if resolution promise rejects', async () => {
      const { registerTaggingApi } = plugin.setup(coreSetup);

      registerTaggingApi(Promise.reject(new Error('something went bad')));

      await nextTick();

      const { getTaggingApi, isTaggingAvailable } = plugin.start(coreStart);

      expect(isTaggingAvailable()).toBe(false);
      expect(getTaggingApi()).toBeUndefined();
    });
  });
});
