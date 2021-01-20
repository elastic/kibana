/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getServices, chance } from './lib';

export function docMissingAndIndexReadOnlySuite() {
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

    // set the index to read only
    await callCluster('indices.putSettings', {
      index: kbnServer.config.get('kibana.index'),
      body: {
        index: {
          blocks: {
            read_only: true,
          },
        },
      },
    });
  });

  afterEach(async () => {
    const { kbnServer, callCluster } = getServices();

    // disable the read only block
    await callCluster('indices.putSettings', {
      index: kbnServer.config.get('kibana.index'),
      body: {
        index: {
          blocks: {
            read_only: false,
          },
        },
      },
    });
  });

  describe('get route', () => {
    it('returns simulated doc with buildNum', async () => {
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
    it('fails with 403 forbidden', async () => {
      const { kbnServer } = getServices();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: { value: defaultIndex },
      });

      expect(statusCode).toBe(403);

      expect(result).toEqual({
        error: 'Forbidden',
        message: expect.stringContaining('index read-only'),
        statusCode: 403,
      });
    });
  });

  describe('setMany route', () => {
    it('fails with 403 forbidden', async () => {
      const { kbnServer } = getServices();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: { defaultIndex },
        },
      });

      expect(statusCode).toBe(403);
      expect(result).toEqual({
        error: 'Forbidden',
        message: expect.stringContaining('index read-only'),
        statusCode: 403,
      });
    });
  });

  describe('delete route', () => {
    it('fails with 403 forbidden', async () => {
      const { kbnServer } = getServices();

      const { statusCode, result } = await kbnServer.inject({
        method: 'DELETE',
        url: '/api/kibana/settings/defaultIndex',
      });

      expect(statusCode).toBe(403);
      expect(result).toEqual({
        error: 'Forbidden',
        message: expect.stringContaining('index read-only'),
        statusCode: 403,
      });
    });
  });
}
