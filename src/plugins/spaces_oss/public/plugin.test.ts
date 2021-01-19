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

import { spacesApiMock } from './api.mock';
import { SpacesOssPlugin } from './plugin';

describe('SpacesOssPlugin', () => {
  let plugin: SpacesOssPlugin;

  beforeEach(() => {
    plugin = new SpacesOssPlugin();
  });

  describe('#setup', () => {
    it('only allows the API to be registered once', async () => {
      const spacesApi = spacesApiMock.create();
      const { registerSpacesApi } = plugin.setup();

      expect(() => registerSpacesApi(spacesApi)).not.toThrow();

      expect(() => registerSpacesApi(spacesApi)).toThrowErrorMatchingInlineSnapshot(
        `"Spaces API can only be registered once"`
      );
    });
  });

  describe('#start', () => {
    it('returns the spaces API if registered', async () => {
      const spacesApi = spacesApiMock.create();
      const { registerSpacesApi } = plugin.setup();

      registerSpacesApi(spacesApi);

      const { isSpacesAvailable, ...api } = plugin.start();

      expect(isSpacesAvailable).toBe(true);
      expect(api).toStrictEqual(spacesApi);
    });

    it('does not return the spaces API if not registered', async () => {
      plugin.setup();

      const { isSpacesAvailable, ...api } = plugin.start();

      expect(isSpacesAvailable).toBe(false);
      expect(Object.keys(api)).toHaveLength(0);
    });
  });
});
