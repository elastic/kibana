/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getServices, chance } from './lib';

export const docExistsSuite = (savedObjectsIndex: string) => () => {
  async function setup(options: { initialSettings?: Record<string, any> } = {}) {
    const { initialSettings } = options;

    const { uiSettings, esClient, supertest } = getServices();

    // delete the kibana index to ensure we start fresh
    await esClient.deleteByQuery({
      index: savedObjectsIndex,
      conflicts: 'proceed',
      body: {
        query: { match_all: {} },
      },
      refresh: true,
      wait_for_completion: true,
    });

    if (initialSettings) {
      await uiSettings.setMany(initialSettings);
    }

    return { uiSettings, supertest };
  }

  describe('get route', () => {
    it('returns a 200 and includes userValues', async () => {
      const defaultIndex = chance.word({ length: 10 });

      const { supertest } = await setup({
        initialSettings: {
          defaultIndex,
        },
      });

      const { body } = await supertest('get', '/api/kibana/settings').expect(200);

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

  describe('set route', () => {
    it('returns a 200 and all values including update', async () => {
      const { supertest } = await setup();

      const defaultIndex = chance.word();

      const { body } = await supertest('post', '/api/kibana/settings/defaultIndex')
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

    it('returns a 400 if trying to set overridden value', async () => {
      const { supertest } = await setup();

      const { body } = await supertest('delete', '/api/kibana/settings/foo')
        .send({
          value: 'baz',
        })
        .expect(400);

      expect(body).toEqual({
        error: 'Bad Request',
        message: 'Unable to update "foo" because it is overridden',
        statusCode: 400,
      });
    });
  });

  describe('setMany route', () => {
    it('returns a 200 and all values including updates', async () => {
      const { supertest } = await setup();

      const defaultIndex = chance.word();
      const { body } = await supertest('post', '/api/kibana/settings')
        .send({
          changes: {
            defaultIndex,
          },
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

    it('returns a 400 if trying to set overridden value', async () => {
      const { supertest } = await setup();

      const { body } = await supertest('post', '/api/kibana/settings')
        .send({
          changes: {
            foo: 'baz',
          },
        })
        .expect(400);

      expect(body).toEqual({
        error: 'Bad Request',
        message: 'Unable to update "foo" because it is overridden',
        statusCode: 400,
      });
    });
  });

  describe('delete route', () => {
    it('returns a 200 and deletes the setting', async () => {
      const defaultIndex = chance.word({ length: 10 });

      const { uiSettings, supertest } = await setup({
        initialSettings: { defaultIndex },
      });

      expect(await uiSettings.get('defaultIndex')).toBe(defaultIndex);

      const { body } = await supertest('delete', '/api/kibana/settings/defaultIndex').expect(200);

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
    it('returns a 400 if deleting overridden value', async () => {
      const { supertest } = await setup();

      const { body } = await supertest('delete', '/api/kibana/settings/foo').expect(400);

      expect(body).toEqual({
        error: 'Bad Request',
        message: 'Unable to update "foo" because it is overridden',
        statusCode: 400,
      });
    });
  });
};
