/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getServices, chance } from './lib';

export function docExistsSuite() {
  async function setup(options: any = {}) {
    const { initialSettings } = options;

    const { kbnServer, uiSettings, callCluster } = getServices();

    // delete the kibana index to ensure we start fresh
    await callCluster('deleteByQuery', {
      index: kbnServer.config.get('kibana.index'),
      body: {
        conflicts: 'proceed',
        query: { match_all: {} },
      },
    });

    if (initialSettings) {
      await uiSettings.setMany(initialSettings);
    }

    return { kbnServer, uiSettings };
  }

  describe('get route', () => {
    it('returns a 200 and includes userValues', async () => {
      const defaultIndex = chance.word({ length: 10 });
      const { kbnServer } = await setup({
        initialSettings: {
          defaultIndex,
        },
      });

      const { statusCode, result } = await kbnServer.inject({
        method: 'GET',
        url: '/api/kibana/settings',
      });

      expect(statusCode).toBe(200);
      expect(result).toMatchObject({
        settings: {
          buildNum: {
            userValue: expect.any(Number),
          },
          defaultIndex: {
            userValue: defaultIndex,
          },
          foo: {
            userValue: 'bar',
            isOverridden: true,
          },
        },
      });
    });
  });

  describe('set route', () => {
    it('returns a 200 and all values including update', async () => {
      const { kbnServer } = await setup();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: {
          value: defaultIndex,
        },
      });

      expect(statusCode).toBe(200);

      expect(result).toMatchObject({
        settings: {
          buildNum: {
            userValue: expect.any(Number),
          },
          defaultIndex: {
            userValue: defaultIndex,
          },
          foo: {
            userValue: 'bar',
            isOverridden: true,
          },
        },
      });
    });

    it('returns a 400 if trying to set overridden value', async () => {
      const { kbnServer } = await setup();

      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/foo',
        payload: {
          value: 'baz',
        },
      });

      expect(statusCode).toBe(400);
      expect(result).toEqual({
        error: 'Bad Request',
        message: 'Unable to update "foo" because it is overridden',
        statusCode: 400,
      });
    });
  });

  describe('setMany route', () => {
    it('returns a 200 and all values including updates', async () => {
      const { kbnServer } = await setup();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: {
            defaultIndex,
          },
        },
      });

      expect(statusCode).toBe(200);

      expect(result).toMatchObject({
        settings: {
          buildNum: {
            userValue: expect.any(Number),
          },
          defaultIndex: {
            userValue: defaultIndex,
          },
          foo: {
            userValue: 'bar',
            isOverridden: true,
          },
        },
      });
    });

    it('returns a 400 if trying to set overridden value', async () => {
      const { kbnServer } = await setup();

      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: {
            foo: 'baz',
          },
        },
      });

      expect(statusCode).toBe(400);
      expect(result).toEqual({
        error: 'Bad Request',
        message: 'Unable to update "foo" because it is overridden',
        statusCode: 400,
      });
    });
  });

  describe('delete route', () => {
    it('returns a 200 and deletes the setting', async () => {
      const defaultIndex = chance.word({ length: 10 });

      const { kbnServer, uiSettings } = await setup({
        initialSettings: { defaultIndex },
      });

      expect(await uiSettings.get('defaultIndex')).toBe(defaultIndex);

      const { statusCode, result } = await kbnServer.inject({
        method: 'DELETE',
        url: '/api/kibana/settings/defaultIndex',
      });

      expect(statusCode).toBe(200);
      expect(result).toMatchObject({
        settings: {
          buildNum: {
            userValue: expect.any(Number),
          },
          foo: {
            userValue: 'bar',
            isOverridden: true,
          },
        },
      });
    });
    it('returns a 400 if deleting overridden value', async () => {
      const { kbnServer } = await setup();

      const { statusCode, result } = await kbnServer.inject({
        method: 'DELETE',
        url: '/api/kibana/settings/foo',
      });

      expect(statusCode).toBe(400);
      expect(result).toEqual({
        error: 'Bad Request',
        message: 'Unable to update "foo" because it is overridden',
        statusCode: 400,
      });
    });
  });
}
