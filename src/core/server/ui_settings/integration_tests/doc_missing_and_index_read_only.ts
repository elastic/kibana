/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getServices, chance } from './lib';

export const docMissingAndIndexReadOnlySuite = (savedObjectsIndex: string) => () => {
  // ensure the kibana index has no documents
  beforeEach(async () => {
    const { callCluster } = getServices();

    // delete all docs from kibana index to ensure savedConfig is not found
    await callCluster('deleteByQuery', {
      index: savedObjectsIndex,
      body: {
        query: { match_all: {} },
      },
    });

    // set the index to read only
    await callCluster('indices.putSettings', {
      index: savedObjectsIndex,
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
    const { callCluster } = getServices();

    // disable the read only block
    await callCluster('indices.putSettings', {
      index: savedObjectsIndex,
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
      const { kbn } = getServices();

      const { body } = await kbn.supertest('get', '/api/kibana/settings').expect(200);

      expect(body).toMatchObject({
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
      const { kbn } = getServices();

      const defaultIndex = chance.word();

      const { body } = await kbn
        .supertest('post', '/api/kibana/settings/defaultIndex')
        .send({
          value: defaultIndex,
        })
        .expect(403);

      expect(body).toEqual({
        error: 'Forbidden',
        message: expect.stringContaining('index read-only'),
        statusCode: 403,
      });
    });
  });

  describe('setMany route', () => {
    it('fails with 403 forbidden', async () => {
      const { kbn } = getServices();
      const defaultIndex = chance.word();

      const { body } = await kbn
        .supertest('post', '/api/kibana/settings')
        .send({
          changes: { defaultIndex },
        })
        .expect(403);

      expect(body).toEqual({
        error: 'Forbidden',
        message: expect.stringContaining('index read-only'),
        statusCode: 403,
      });
    });
  });

  describe('delete route', () => {
    it('fails with 403 forbidden', async () => {
      const { kbn } = getServices();

      const { body } = await kbn
        .supertest('delete', '/api/kibana/settings/defaultIndex')
        .expect(403);

      expect(body).toEqual({
        error: 'Forbidden',
        message: expect.stringContaining('index read-only'),
        statusCode: 403,
      });
    });
  });
};
