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
import { spacesApiMock } from './api.mock';
import { SpacesOssPlugin } from './plugin';

describe('SpacesOssPlugin', () => {
  let plugin: SpacesOssPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    coreSetup = coreMock.createSetup();
    plugin = new SpacesOssPlugin(coreMock.createPluginInitializerContext());
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

    it('returns the spaces API if registered', async () => {
      const spacesApi = spacesApiMock.create();
      const { registerSpacesApi } = plugin.setup(coreSetup);

      registerSpacesApi(Promise.resolve(spacesApi));

      await nextTick();

      const { getSpacesApi, isSpacesAvailable } = plugin.start(coreStart);

      expect(isSpacesAvailable()).toBe(true);
      expect(getSpacesApi()).toStrictEqual(spacesApi);
    });

    it('does not return the spaces API if not registered', async () => {
      plugin.setup(coreSetup);

      await nextTick();

      const { getSpacesApi, isSpacesAvailable } = plugin.start(coreStart);

      expect(isSpacesAvailable()).toBe(false);
      expect(getSpacesApi()).toBeUndefined();
    });

    it('does not return the spaces API if resolution promise rejects', async () => {
      const { registerSpacesApi } = plugin.setup(coreSetup);

      registerSpacesApi(Promise.reject(new Error('something went bad')));

      await nextTick();

      const { getSpacesApi, isSpacesAvailable } = plugin.start(coreStart);

      expect(isSpacesAvailable()).toBe(false);
      expect(getSpacesApi()).toBeUndefined();
    });
  });
});
