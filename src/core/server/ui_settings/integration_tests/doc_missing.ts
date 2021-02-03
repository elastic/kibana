/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getServices, chance } from './lib';

export function docMissingSuite() {
  // ensure the kibana index has no documents
  beforeEach(async () => {
    const { kbnServer, callCluster } = getServices();

    // write a setting to ensure kibana index is created
    await kbnServer.inject({
      method: 'POST',
      url: '/api/kibana/settings/defaultIndex',
      payload: { value: 'abc' },
    });

    // delete all docs from kibana index to ensure savedConfig is not found
    await callCluster('deleteByQuery', {
      index: kbnServer.config.get('kibana.index'),
      body: {
        query: { match_all: {} },
      },
    });
  });

  describe('get route', () => {
    it('creates doc, returns a 200 with settings', async () => {
      const { kbnServer } = getServices();

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
          foo: {
            userValue: 'bar',
            isOverridden: true,
          },
        },
      });
    });
  });

  describe('set route', () => {
    it('creates doc, returns a 200 with value set', async () => {
      const { kbnServer } = getServices();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: { value: defaultIndex },
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

  describe('setMany route', () => {
    it('creates doc, returns 200 with updated values', async () => {
      const { kbnServer } = getServices();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: { defaultIndex },
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
  });

  describe('delete route', () => {
    it('creates doc, returns a 200 with just buildNum', async () => {
      const { kbnServer } = getServices();

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
  });
}
