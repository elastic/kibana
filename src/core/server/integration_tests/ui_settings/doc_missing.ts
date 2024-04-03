/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getServices, chance } from './lib';

export const docMissingSuite = (savedObjectsIndex: string) => () => {
  // ensure the kibana index has no documents
  beforeEach(async () => {
    const { esClient } = getServices();

    await esClient.indices.refresh({ index: savedObjectsIndex });

    // delete all docs from kibana index to ensure savedConfig is not found
    await esClient.deleteByQuery({
      index: savedObjectsIndex,
      body: {
        query: { match_all: {} },
      },
    });
  });

  describe('get route', () => {
    it('creates doc, returns a 200 with settings', async () => {
      const { supertest } = getServices();

      const { body } = await supertest('get', '/internal/kibana/settings').expect(200);

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
    it('creates doc, returns a 200 with value set', async () => {
      const { supertest } = getServices();
      const defaultIndex = chance.word();

      const { body } = await supertest('post', '/internal/kibana/settings/defaultIndex')
        .send({
          value: defaultIndex,
        })
        .expect(200);

      expect(body).toMatchObject({
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
      const { supertest } = getServices();

      const defaultIndex = chance.word();

      const { body } = await supertest('post', '/internal/kibana/settings')
        .send({
          changes: { defaultIndex },
        })
        .expect(200);

      expect(body).toMatchObject({
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
      const { supertest } = getServices();

      const { body } = await supertest('delete', '/internal/kibana/settings/defaultIndex').expect(
        200
      );

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
};
