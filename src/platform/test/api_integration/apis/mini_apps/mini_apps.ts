/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';

const MINI_APPS_API_BASE = '/api/mini_apps';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  const createMiniApp = (data: { name: string; script_code?: string }) =>
    supertest
      .post(MINI_APPS_API_BASE)
      .set('kbn-xsrf', 'true')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send(data);

  const getMiniApp = (id: string) =>
    supertest
      .get(`${MINI_APPS_API_BASE}/${id}`)
      .set('kbn-xsrf', 'true')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

  const listMiniApps = () =>
    supertest
      .get(MINI_APPS_API_BASE)
      .set('kbn-xsrf', 'true')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

  const updateMiniApp = (id: string, data: { name?: string; script_code?: string }) =>
    supertest
      .put(`${MINI_APPS_API_BASE}/${id}`)
      .set('kbn-xsrf', 'true')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send(data);

  const deleteMiniApp = (id: string) =>
    supertest
      .delete(`${MINI_APPS_API_BASE}/${id}`)
      .set('kbn-xsrf', 'true')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

  describe('Mini Apps API', function () {
    afterEach(async () => {
      await kibanaServer.savedObjects.clean({ types: ['mini-app'] });
    });

    describe('create', () => {
      it('should return 200 for creating a mini app', async () => {
        const { body } = await createMiniApp({
          name: 'Test Mini App',
          script_code: 'console.log("Hello");',
        }).expect(200);

        expect(body.id).to.be.a('string');
        expect(body.name).to.be('Test Mini App');
        expect(body.script_code).to.be('console.log("Hello");');
        expect(body.created_at).to.be.a('string');
        expect(body.updated_at).to.be.a('string');
      });

      it('should return 200 with default empty script_code', async () => {
        const { body } = await createMiniApp({
          name: 'Test Mini App',
        }).expect(200);

        expect(body.name).to.be('Test Mini App');
        expect(body.script_code).to.be('');
      });

      it('should return 400 for missing name', async () => {
        await createMiniApp({ name: '' }).expect(400);
      });
    });

    describe('get', () => {
      it('should return 200 for getting a mini app', async () => {
        const createResponse = await createMiniApp({
          name: 'Test Mini App',
          script_code: 'console.log("Hello");',
        }).expect(200);

        const { body } = await getMiniApp(createResponse.body.id).expect(200);

        expect(body.id).to.be(createResponse.body.id);
        expect(body.name).to.be('Test Mini App');
        expect(body.script_code).to.be('console.log("Hello");');
      });

      it('should return 404 for non-existent mini app', async () => {
        await getMiniApp('non-existent-id').expect(404);
      });
    });

    describe('list', () => {
      it('should return 200 with empty list initially', async () => {
        const { body } = await listMiniApps().expect(200);

        expect(body.items).to.be.an('array');
        expect(body.items.length).to.be(0);
        expect(body.total).to.be(0);
      });

      it('should return all mini apps', async () => {
        await createMiniApp({ name: 'Mini App 1' }).expect(200);
        await createMiniApp({ name: 'Mini App 2' }).expect(200);

        const { body } = await listMiniApps().expect(200);

        expect(body.items.length).to.be(2);
        expect(body.total).to.be(2);

        const names = body.items.map((item: { name: string }) => item.name);
        expect(names).to.contain('Mini App 1');
        expect(names).to.contain('Mini App 2');
      });
    });

    describe('update', () => {
      it('should return 200 for updating a mini app', async () => {
        const createResponse = await createMiniApp({
          name: 'Original Name',
          script_code: 'original code',
        }).expect(200);

        const { body } = await updateMiniApp(createResponse.body.id, {
          name: 'Updated Name',
          script_code: 'updated code',
        }).expect(200);

        expect(body.id).to.be(createResponse.body.id);
        expect(body.name).to.be('Updated Name');
        expect(body.script_code).to.be('updated code');
      });

      it('should allow partial updates', async () => {
        const createResponse = await createMiniApp({
          name: 'Original Name',
          script_code: 'original code',
        }).expect(200);

        const { body } = await updateMiniApp(createResponse.body.id, {
          name: 'Updated Name Only',
        }).expect(200);

        expect(body.name).to.be('Updated Name Only');
        expect(body.script_code).to.be('original code');
      });

      it('should return 404 for non-existent mini app', async () => {
        await updateMiniApp('non-existent-id', { name: 'Test' }).expect(404);
      });
    });

    describe('delete', () => {
      it('should return 200 for deleting a mini app', async () => {
        const createResponse = await createMiniApp({
          name: 'Test Mini App',
        }).expect(200);

        await deleteMiniApp(createResponse.body.id).expect(200);

        // Verify it's deleted
        await getMiniApp(createResponse.body.id).expect(404);
      });

      it('should return 404 for non-existent mini app', async () => {
        await deleteMiniApp('non-existent-id').expect(404);
      });
    });

    describe('CRUD flow', () => {
      it('should handle full create, read, update, delete flow', async () => {
        // Create
        const createResponse = await createMiniApp({
          name: 'CRUD Test App',
          script_code: 'const x = 1;',
        }).expect(200);

        const miniAppId = createResponse.body.id;
        expect(miniAppId).to.be.a('string');

        // Read
        const getResponse = await getMiniApp(miniAppId).expect(200);
        expect(getResponse.body.name).to.be('CRUD Test App');

        // List
        const listResponse = await listMiniApps().expect(200);
        expect(listResponse.body.items.some((item: { id: string }) => item.id === miniAppId)).to.be(
          true
        );

        // Update
        const updateResponse = await updateMiniApp(miniAppId, {
          name: 'Updated CRUD Test App',
          script_code: 'const y = 2;',
        }).expect(200);
        expect(updateResponse.body.name).to.be('Updated CRUD Test App');
        expect(updateResponse.body.script_code).to.be('const y = 2;');

        // Verify update persisted
        const getAfterUpdate = await getMiniApp(miniAppId).expect(200);
        expect(getAfterUpdate.body.name).to.be('Updated CRUD Test App');

        // Delete
        await deleteMiniApp(miniAppId).expect(200);

        // Verify deletion
        await getMiniApp(miniAppId).expect(404);

        // List should be empty
        const listAfterDelete = await listMiniApps().expect(200);
        expect(
          listAfterDelete.body.items.some((item: { id: string }) => item.id === miniAppId)
        ).to.be(false);
      });
    });
  });
}
