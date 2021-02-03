/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
