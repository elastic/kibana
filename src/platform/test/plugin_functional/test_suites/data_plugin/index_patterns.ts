/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Migration recommendation: MIGRATE TO SCOUT API. All 4 tests call plugin-registered HTTP routes
 * via supertest and assert on JSON response bodies — no browser interaction required.
 *
 * Migration notes:
 * - The routes under test are registered by the `index_patterns` fixture plugin
 *   (src/platform/test/plugin_functional/plugins/index_patterns). That plugin must be kept
 *   registered for the Scout run, or its CRUD route logic replaced by direct calls to the
 *   public index-patterns REST API (`/api/index_patterns/index_pattern`).
 * - Tests are sequential: `indexPatternId` created in test 1 is reused by tests 2–4, and the
 *   pattern is deleted in test 4. Either chain them with `test.step` or give each test its own
 *   setup/teardown so they are independently retryable.
 * - The `before` hook calls `esArchiver.emptyKibanaIndex()`; reproduce this with the Scout
 *   `kibanaServer.savedObjects.clean` equivalent before the suite runs.
 */
import expect from '@kbn/expect';
import type { PluginFunctionalProviderContext } from '../../services';
import '@kbn/core-provider-plugin/types';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('index patterns', function () {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
    });
    let indexPatternId = '';

    it('can create an index pattern', async () => {
      const title = 'shakes*';
      const fieldFormats = { bytes: { id: 'bytes' } };
      const body = await (
        await supertest
          .post('/api/index-patterns-plugin/create')
          .set('kbn-xsrf', 'anything')
          .send({ title, fieldFormats })
          .expect(200)
      ).body;

      indexPatternId = body.id;
      expect(body.id).not.empty();
      expect(body.title).to.equal(title);
      expect(body.fields.length).to.equal(15);
      expect(body.fieldFormatMap).to.eql(fieldFormats);
    });

    it('can get index pattern by id', async () => {
      const body = await (
        await supertest.get(`/api/index-patterns-plugin/get/${indexPatternId}`).expect(200)
      ).body;
      expect(typeof body.id).to.equal('string');
    });

    it('can update index pattern', async () => {
      const resp = await supertest
        .get(`/api/index-patterns-plugin/update/${indexPatternId}`)
        .expect(200);
      expect(resp.body).to.eql({});
    });

    it('can delete index pattern', async () => {
      await supertest.get(`/api/index-patterns-plugin/delete/${indexPatternId}`).expect(200);
    });
  });
}
