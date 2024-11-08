/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getServices, chance } from './lib';

export const docExistsSuite = (savedObjectsIndex: string) => () => {
  async function setup(
    options: {
      initialSettings?: Record<string, any>;
      initialGlobalSettings?: Record<string, any>;
    } = {}
  ) {
    const { initialSettings, initialGlobalSettings } = options;

    const { uiSettings, uiSettingsGlobal, esClient, supertest } = getServices();

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
    if (initialGlobalSettings) {
      await uiSettingsGlobal.setMany(initialGlobalSettings);
    }

    return { uiSettings, uiSettingsGlobal, supertest };
  }

  describe('get route', () => {
    it('returns a 200 and includes userValues', async () => {
      const defaultIndex = chance.word({ length: 10 });

      const { supertest } = await setup({
        initialSettings: {
          defaultIndex,
        },
      });

      const { body } = await supertest('get', '/internal/kibana/settings')
        .set('x-elastic-internal-origin', 'kibana')
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

  describe('set route', () => {
    it('returns a 200 and all values including update', async () => {
      const { supertest } = await setup();

      const defaultIndex = chance.word();

      const { body } = await supertest('post', '/internal/kibana/settings/defaultIndex')
        .set('x-elastic-internal-origin', 'kibana')
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

      const { body } = await supertest('delete', '/internal/kibana/settings/foo')
        .set('x-elastic-internal-origin', 'kibana')
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
      const { body } = await supertest('post', '/internal/kibana/settings')
        .set('x-elastic-internal-origin', 'kibana')
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

      const { body } = await supertest('post', '/internal/kibana/settings')
        .set('x-elastic-internal-origin', 'kibana')
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

      const { body } = await supertest('delete', '/internal/kibana/settings/defaultIndex')
        .set('x-elastic-internal-origin', 'kibana')
        .expect(200);

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

      const { body } = await supertest('delete', '/internal/kibana/settings/foo')
        .set('x-elastic-internal-origin', 'kibana')
        .expect(400);

      expect(body).toEqual({
        error: 'Bad Request',
        message: 'Unable to update "foo" because it is overridden',
        statusCode: 400,
      });
    });
  });

  describe('global', () => {
    describe('get route', () => {
      it('returns a 200 and includes userValues', async () => {
        const defaultIndex = chance.word({ length: 10 });

        const { supertest } = await setup({
          initialGlobalSettings: {
            defaultIndex,
          },
        });

        const { body } = await supertest('get', '/internal/kibana/global_settings')
          .set('x-elastic-internal-origin', 'kibana')
          .expect(200);

        expect(body).toMatchObject({
          settings: {
            buildNum: {
              userValue: expect.any(Number),
            },
            defaultIndex: {
              userValue: defaultIndex,
            },
          },
        });
      });
    });

    describe('set route', () => {
      it('returns a 200 and all values including update', async () => {
        const { supertest } = await setup();

        const defaultIndex = chance.word();

        const { body } = await supertest('post', '/internal/kibana/global_settings/defaultIndex')
          .set('x-elastic-internal-origin', 'kibana')
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
          },
        });
      });

      // kbn server only created with uiSettings overrides. Global settings don't seem to support overrides from kibana.yml
      it.skip('returns a 400 if trying to set overridden value', async () => {
        const { supertest } = await setup();

        const { body } = await supertest('delete', '/internal/kibana/global_settings/foo')
          .set('x-elastic-internal-origin', 'kibana')
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
        const { body } = await supertest('post', '/internal/kibana/global_settings')
          .set('x-elastic-internal-origin', 'kibana')
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
          },
        });
      });

      // kbn server only created with uiSettings overrides. Global settings don't seem to support overrides from kibana.yml
      it.skip('returns a 400 if trying to set overridden value', async () => {
        const { supertest } = await setup();

        const { body } = await supertest('post', '/internal/kibana/global_settings')
          .set('x-elastic-internal-origin', 'kibana')
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

        const { uiSettingsGlobal, supertest } = await setup({
          initialGlobalSettings: { defaultIndex },
        });

        expect(await uiSettingsGlobal.get('defaultIndex')).toBe(defaultIndex);

        const { body } = await supertest('delete', '/internal/kibana/global_settings/defaultIndex')
          .set('x-elastic-internal-origin', 'kibana')
          .expect(200);

        expect(body).toMatchObject({
          settings: {
            buildNum: {
              userValue: expect.any(Number),
            },
          },
        });
      });
      // kbn server only created with uiSettings overrides. Global settings don't seem to support overrides from kibana.yml
      it.skip('returns a 400 if deleting overridden value', async () => {
        const { supertest } = await setup();

        const { body } = await supertest('delete', '/internal/kibana/global_settings/foo')
          .set('x-elastic-internal-origin', 'kibana')
          .expect(400);

        expect(body).toEqual({
          error: 'Bad Request',
          message: 'Unable to update "foo" because it is overridden',
          statusCode: 400,
        });
      });
    });
  });
};
