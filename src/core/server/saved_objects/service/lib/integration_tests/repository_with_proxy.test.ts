/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Hapi from '@hapi/hapi';
import h2o2 from '@hapi/h2o2';
import { URL } from 'url';
import { ISavedObjectsRepository } from '../repository';
import { SavedObject } from '../../../types';
import { InternalCoreSetup, InternalCoreStart } from '../../../../internal_types';
import { Root } from '../../../../root';
import * as kbnTestServer from '../../../../../test_helpers/kbn_server';
import {
  declareGetRoute,
  declareDeleteRoute,
  declarePostBulkRoute,
  declarePostMgetRoute,
  declareGetSearchRoute,
  declarePostSearchRoute,
  declarePostUpdateRoute,
  declarePostPitRoute,
  declarePostUpdateByQueryRoute,
  declarePassthroughRoute,
  setProxyInterrupt,
} from './repository_with_proxy_utils';

let esServer: kbnTestServer.TestElasticsearchUtils;
let hapiServer: Hapi.Server;

const registerSOTypes = (setup: InternalCoreSetup) => {
  setup.savedObjects.registerType({
    name: 'my_type',
    hidden: false,
    mappings: {
      dynamic: false,
      properties: {
        title: { type: 'text' },
      },
    },
    namespaceType: 'single',
  });
  setup.savedObjects.registerType({
    name: 'my_other_type',
    hidden: false,
    mappings: {
      dynamic: false,
      properties: {
        title: { type: 'text' },
      },
    },
    namespaceType: 'single',
  });
};

describe('404s from proxies', () => {
  let root: Root;
  let start: InternalCoreStart;

  beforeAll(async () => {
    setProxyInterrupt(null);

    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
    });
    esServer = await startES();

    const { hostname: esHostname, port: esPort } = new URL(esServer.hosts[0]);

    // inspired by https://github.com/elastic/kibana/pull/88919
    const proxyPort = process.env.TEST_PROXY_SERVER_PORT
      ? parseInt(process.env.TEST_PROXY_SERVER_PORT, 10)
      : 5698;

    // Setup custom hapi hapiServer with h2o2 plugin for proxying
    hapiServer = Hapi.server({
      port: proxyPort,
    });

    await hapiServer.register(h2o2);
    // register specific routes to modify the response and a catch-all to relay the request/response as-is

    declareGetRoute(hapiServer, esHostname, esPort);
    declareDeleteRoute(hapiServer, esHostname, esPort);
    declarePostUpdateRoute(hapiServer, esHostname, esPort);

    declareGetSearchRoute(hapiServer, esHostname, esPort);
    declarePostSearchRoute(hapiServer, esHostname, esPort);
    declarePostBulkRoute(hapiServer, esHostname, esPort);
    declarePostMgetRoute(hapiServer, esHostname, esPort);
    declarePostPitRoute(hapiServer, esHostname, esPort);
    declarePostUpdateByQueryRoute(hapiServer, esHostname, esPort);

    declarePassthroughRoute(hapiServer, esHostname, esPort);

    await hapiServer.start();

    // Setup kibana configured to use proxy as ES backend
    root = kbnTestServer.createRootWithCorePlugins({
      elasticsearch: {
        hosts: [`http://${esHostname}:${proxyPort}`],
      },
      migrations: {
        skip: false,
      },
    });
    await root.preboot();
    const setup = await root.setup();
    registerSOTypes(setup);

    start = await root.start();
  });

  afterAll(async () => {
    await root.shutdown();
    await hapiServer.stop({ timeout: 1000 });
    await esServer.stop();
  });

  describe('requests when a proxy relays request/responses with the correct product header', () => {
    let repository: ISavedObjectsRepository;
    let myOtherType: SavedObject;
    const myOtherTypeDocs: SavedObject[] = [];

    beforeAll(async () => {
      repository = start.savedObjects.createInternalRepository();

      myOtherType = await repository.create(
        'my_other_type',
        { title: 'my_other_type1' },
        { overwrite: false, references: [] }
      );
      for (let i = 1; i < 11; i++) {
        myOtherTypeDocs.push({
          type: 'my_other_type',
          id: `myOtherTypeId${i}`,
          attributes: { title: `MyOtherTypeTitle${i}` },
          references: [],
        });
      }
      await repository.bulkCreate(myOtherTypeDocs, {
        overwrite: true,
        namespace: 'default',
      });
    });

    beforeEach(() => {
      setProxyInterrupt(null);
    });

    it('does not alter a Not Found response if the document does not exist and the proxy returns the correct product header', async () => {
      let customErr: any;
      try {
        await repository.get('my_other_type', '123');
      } catch (err) {
        customErr = err;
      }
      expect(customErr?.output?.statusCode).toBe(404);
      expect(customErr?.output?.payload?.message).toBe(
        'Saved object [my_other_type/123] not found'
      );
    });

    it('returns a document if it exists and if the proxy passes through the product header', async () => {
      const myOtherTypeDoc = await repository.get('my_other_type', `${myOtherType.id}`);
      expect(myOtherTypeDoc.type).toBe('my_other_type');
    });

    it('handles `update` requests that are successful', async () => {
      const docToUpdate = await repository.create(
        'my_other_type',
        { title: 'original title' },
        { overwrite: false, references: [] }
      );

      const updatedDoc = await repository.update('my_other_type', `${docToUpdate.id}`, {
        title: 'updated title',
      });
      expect(updatedDoc.type).toBe('my_other_type');
      expect(updatedDoc.attributes.title).toBe('updated title');
    });

    it('handles `bulkCreate` requests when the proxy relays request/responses correctly', async () => {
      const bulkObjects = [
        {
          type: 'my_other_type',
          id: 'my_other_type1',
          attributes: {
            title: 'bulkType1',
          },
          references: [],
        },
        {
          type: 'my_other_type',
          id: 'my_other_type2',
          attributes: {
            title: 'bulkType2',
          },
          references: [],
        },
      ];
      const bulkResponse = await repository.bulkCreate(bulkObjects, {
        namespace: 'default',
        overwrite: true,
      });
      expect(bulkResponse.saved_objects.length).toEqual(2);
    });

    it('returns matches from `find` when the proxy passes through the response and product header', async () => {
      const type = 'my_other_type';
      const result = await repository.find({ type });
      expect(result.saved_objects.length).toBeGreaterThan(0);
    });

    it('handles `delete` requests that are successful', async () => {
      let deleteErr: any;
      const docToDelete = await repository.create(
        'my_other_type',
        { title: 'delete me please' },
        { id: 'docToDelete1', overwrite: true, references: [] }
      );
      const deleteResult = await repository.delete('my_other_type', 'docToDelete1', {
        namespace: 'default',
      });
      expect(deleteResult).toStrictEqual({});
      try {
        await repository.get('my_other_type', 'docToDelete1');
      } catch (err) {
        deleteErr = err;
      }
      expect(deleteErr?.output?.statusCode).toBe(404);
      expect(deleteErr?.output?.payload?.message).toBe(
        `Saved object [my_other_type/${docToDelete.id}] not found`
      );
    });

    it('handles `bulkGet` requests that are successful when the proxy passes through the product header', async () => {
      const docsToGet = myOtherTypeDocs;
      const docsFound = await repository.bulkGet(
        docsToGet.map((doc) => ({ id: doc.id, type: 'my_other_type' }))
      );
      expect(docsFound.saved_objects.length).toBeGreaterThan(0);
    });

    it('handles `bulkResolve` requests that are successful when the proxy passes through the product header', async () => {
      const docsToGet = myOtherTypeDocs;
      const docsFound = await repository.bulkResolve(
        docsToGet.map((doc) => ({ id: doc.id, type: 'my_other_type' }))
      );
      expect(docsFound.resolved_objects.length).toBeGreaterThan(0);
      expect(docsFound.resolved_objects[0].outcome).toBe('exactMatch');
    });

    it('handles `resolve` requests that are successful with an exact match', async () => {
      const resolvedExactMatch = await repository.resolve('my_other_type', `${myOtherType.id}`);
      expect(resolvedExactMatch.outcome).toBe('exactMatch');
    });

    it('handles `openPointInTime` requests when the proxy passes through the product header', async () => {
      const openPitResult = await repository.openPointInTimeForType('my_other_type');
      expect(Object.keys(openPitResult)).toContain('id');
    });

    it('handles `checkConflicts` requests that are successful when the proxy passes through the product header', async () => {
      const checkConflictsResult = await repository.checkConflicts(
        [
          { id: myOtherTypeDocs[0].id, type: myOtherTypeDocs[0].type },
          { id: 'myOtherType456', type: 'my_other_type' },
        ],
        { namespace: 'default' }
      );
      expect(checkConflictsResult.errors.length).toEqual(1);
      expect(checkConflictsResult.errors[0].error.error).toStrictEqual('Conflict');
    });

    // this test must come last, it deletes all saved objects in the default space
    it('handles `deleteByNamespace` requests when the proxy passes through the product header', async () => {
      const deleteByNamespaceResult = await repository.deleteByNamespace('default');
      expect(Object.keys(deleteByNamespaceResult)).toEqual(
        expect.arrayContaining(['total', 'updated', 'deleted'])
      );
    });
  });

  describe('requests when a proxy returns Not Found with an incorrect product header', () => {
    let repository: ISavedObjectsRepository;
    const myTypeDocs: SavedObject[] = [];

    const genericNotFoundEsUnavailableError = (err: any, type?: string, id?: string) => {
      expect(err?.output?.statusCode).toBe(503);
      if (type && id) {
        expect(err?.output?.payload?.message).toBe(
          `x-elastic-product not present or not recognized: Saved object [${type}/${id}] not found`
        );
      } else {
        expect(err?.output?.payload?.message).toBe(
          `x-elastic-product not present or not recognized: Not Found`
        );
      }
    };

    beforeAll(async () => {
      setProxyInterrupt(null); // allow saved object creation
      repository = start.savedObjects.createInternalRepository();

      for (let i = 1; i < 11; i++) {
        myTypeDocs.push({
          type: 'my_type',
          id: `myTypeId${i}`,
          attributes: { title: `MyTypeTitle${i}` },
          references: [],
        });
      }
      await repository.bulkCreate(
        [
          ...myTypeDocs,
          {
            type: 'my_type',
            id: 'myTypeToUpdate',
            attributes: { title: 'myTypeToUpdateTitle' },
            references: [],
          },
        ],
        {
          overwrite: true,
          namespace: 'default',
        }
      );
    });
    beforeEach(() => {
      setProxyInterrupt(null); // switch to non-proxied handler
    });

    it('returns an EsUnavailable error if the document exists but the proxy cannot find the es node (mimics allocator changes)', async () => {
      let myError;
      try {
        await repository.get('my_type', 'myTypeId1');
      } catch (err) {
        myError = err;
      }
      expect(genericNotFoundEsUnavailableError(myError, 'my_type', 'myTypeId1'));
    });

    it('returns an EsUnavailable error on `update` requests that are interrupted', async () => {
      let updateError;
      try {
        await repository.update('my_type', 'myTypeToUpdate', {
          title: 'updated title',
        });
        expect(false).toBe(true); // Should not get here (we expect the call to throw)
      } catch (err) {
        updateError = err;
      }
      expect(genericNotFoundEsUnavailableError(updateError));
    });

    it('returns an EsUnavailable error on `bulkCreate` requests with a 404 proxy response and wrong product header', async () => {
      setProxyInterrupt('bulkCreate');
      let bulkCreateError: any;
      const bulkObjects = [
        {
          type: 'my_type',
          id: '1',
          attributes: {
            title: 'bulkType1',
          },
          references: [],
        },
        {
          type: 'my_type',
          id: '2',
          attributes: {
            title: 'bulkType2',
          },
          references: [],
        },
      ];
      try {
        await repository.bulkCreate(bulkObjects, { namespace: 'default', overwrite: true });
      } catch (err) {
        bulkCreateError = err;
      }
      expect(genericNotFoundEsUnavailableError(bulkCreateError));
    });

    it('returns an EsUnavailable error on `find` requests with a 404 proxy response and wrong product header', async () => {
      setProxyInterrupt('find');
      let findErr: any;
      try {
        await repository.find({ type: 'my_type' });
      } catch (err) {
        findErr = err;
      }
      expect(genericNotFoundEsUnavailableError(findErr));
      expect(findErr?.output?.payload?.error).toBe('Service Unavailable');
    });

    it('returns an EsUnavailable error on `delete` requests with a 404 proxy response and wrong product header', async () => {
      let deleteErr: any;
      try {
        await repository.delete('my_type', 'myTypeId1', { namespace: 'default' });
      } catch (err) {
        deleteErr = err;
      }
      expect(genericNotFoundEsUnavailableError(deleteErr, 'my_type', 'myTypeId1'));
    });

    it('returns an EsUnavailable error on `bulkResolve` requests with a 404 proxy response and wrong product header for an exact match', async () => {
      const docsToGet = myTypeDocs;
      let testBulkResolveErr: any;
      setProxyInterrupt('internalBulkResolve');
      try {
        await repository.bulkGet(docsToGet.map((doc) => ({ id: doc.id, type: 'my_type' })));
      } catch (err) {
        testBulkResolveErr = err;
      }
      expect(genericNotFoundEsUnavailableError(testBulkResolveErr));
    });

    it('returns an EsUnavailable error on `resolve` requests with a 404 proxy response and wrong product header for an exact match', async () => {
      setProxyInterrupt('internalBulkResolve');
      let testResolveErr: any;
      try {
        await repository.resolve('my_type', 'myTypeId1');
      } catch (err) {
        testResolveErr = err;
      }
      expect(genericNotFoundEsUnavailableError(testResolveErr));
    });

    it('returns an EsUnavailable error on `bulkGet` requests with a 404 proxy response and wrong product header', async () => {
      const docsToGet = myTypeDocs;
      let bulkGetError: any;
      setProxyInterrupt('bulkGetMyType');
      try {
        await repository.bulkGet(docsToGet.map((doc) => ({ id: doc.id, type: 'my_type' })));
      } catch (err) {
        bulkGetError = err;
      }
      expect(genericNotFoundEsUnavailableError(bulkGetError));
    });

    it('returns an EsUnavailable error on `openPointInTimeForType` requests with a 404 proxy response and wrong product header', async () => {
      setProxyInterrupt('openPit');
      let openPitErr: any;
      try {
        await repository.openPointInTimeForType('my_other_type');
      } catch (err) {
        openPitErr = err;
      }
      expect(genericNotFoundEsUnavailableError(openPitErr));
    });

    it('returns an EsUnavailable error on `checkConflicts` requests with a 404 proxy response and wrong product header', async () => {
      setProxyInterrupt('checkConficts');
      let checkConflictsErr: any;
      try {
        await repository.checkConflicts(
          [
            { id: myTypeDocs[0].id, type: myTypeDocs[0].type },
            { id: 'myType456', type: 'my_type' },
          ],
          { namespace: 'default' }
        );
      } catch (err) {
        checkConflictsErr = err;
      }
      expect(genericNotFoundEsUnavailableError(checkConflictsErr));
    });

    it('returns an EsUnavailable error on `deleteByNamespace` requests with a 404 proxy response and wrong product header', async () => {
      setProxyInterrupt('deleteByNamespace');
      let deleteByNamespaceErr: any;
      try {
        await repository.deleteByNamespace('default');
      } catch (err) {
        deleteByNamespaceErr = err;
      }
      expect(genericNotFoundEsUnavailableError(deleteByNamespaceErr));
    });
  });
});
