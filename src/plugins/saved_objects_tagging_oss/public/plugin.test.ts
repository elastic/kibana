/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { coreMock } from '../../../core/public/mocks';
import { savedObjectsPluginMock } from '../../saved_objects/public/mocks';
import { tagDecoratorConfig } from './decorator';
import { taggingApiMock } from './api.mock';
import { SavedObjectTaggingOssPlugin } from './plugin';

describe('SavedObjectTaggingOssPlugin', () => {
  let plugin: SavedObjectTaggingOssPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    coreSetup = coreMock.createSetup();
    plugin = new SavedObjectTaggingOssPlugin(coreMock.createPluginInitializerContext());
  });

  describe('#setup', () => {
    it('registers the tag SO decorator if the `savedObjects` plugin is present', () => {
      const savedObjects = savedObjectsPluginMock.createSetupContract();

      plugin.setup(coreSetup, { savedObjects });

      expect(savedObjects.registerDecorator).toHaveBeenCalledTimes(1);
      expect(savedObjects.registerDecorator).toHaveBeenCalledWith(tagDecoratorConfig);
    });

    it('does not fail if the `savedObjects` plugin is not present', () => {
      expect(() => {
        plugin.setup(coreSetup, {});
      }).not.toThrow();
    });
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
      const { registerTaggingApi } = plugin.setup(coreSetup, {});

      registerTaggingApi(Promise.resolve(taggingApi));

      await nextTick();

      const { getTaggingApi, isTaggingAvailable } = plugin.start(coreStart);

      expect(isTaggingAvailable()).toBe(true);
      expect(getTaggingApi()).toStrictEqual(taggingApi);
    });
    it('does not return the tagging API if not registered', async () => {
      plugin.setup(coreSetup, {});

      await nextTick();

      const { getTaggingApi, isTaggingAvailable } = plugin.start(coreStart);

      expect(isTaggingAvailable()).toBe(false);
      expect(getTaggingApi()).toBeUndefined();
    });
    it('does not return the tagging API if resolution promise rejects', async () => {
      const { registerTaggingApi } = plugin.setup(coreSetup, {});

      registerTaggingApi(Promise.reject(new Error('something went bad')));

      await nextTick();

      const { getTaggingApi, isTaggingAvailable } = plugin.start(coreStart);

      expect(isTaggingAvailable()).toBe(false);
      expect(getTaggingApi()).toBeUndefined();
    });
  });
});
