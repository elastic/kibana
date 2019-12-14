/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';
import { shortUrlLookupProvider } from './short_url_lookup';
import { SavedObjectsClient } from '../../../../../core/server';

describe('shortUrlLookupProvider', () => {
  const ID = 'bf00ad16941fc51420f91a93428b27a0';
  const TYPE = 'url';
  const URL = 'http://elastic.co';
  const server = { log: sinon.stub() };
  const sandbox = sinon.createSandbox();

  let savedObjectsClient;
  let req;
  let shortUrl;

  beforeEach(() => {
    savedObjectsClient = {
      get: sandbox.stub(),
      create: sandbox.stub().returns(Promise.resolve({ id: ID })),
      update: sandbox.stub(),
      errors: SavedObjectsClient.errors,
    };

    req = { getSavedObjectsClient: () => savedObjectsClient };
    shortUrl = shortUrlLookupProvider(server);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('generateUrlId', () => {
    it('returns the document id', async () => {
      const id = await shortUrl.generateUrlId(URL, req);
      expect(id).toEqual(ID);
    });

    it('provides correct arguments to savedObjectsClient', async () => {
      await shortUrl.generateUrlId(URL, req);

      sinon.assert.calledOnce(savedObjectsClient.create);
      const [type, attributes, options] = savedObjectsClient.create.getCall(0).args;

      expect(type).toEqual(TYPE);
      expect(Object.keys(attributes).sort()).toEqual([
        'accessCount',
        'accessDate',
        'createDate',
        'url',
      ]);
      expect(attributes.url).toEqual(URL);
      expect(options.id).toEqual(ID);
    });

    it('passes persists attributes', async () => {
      await shortUrl.generateUrlId(URL, req);

      sinon.assert.calledOnce(savedObjectsClient.create);
      const [type, attributes] = savedObjectsClient.create.getCall(0).args;

      expect(type).toEqual(TYPE);
      expect(Object.keys(attributes).sort()).toEqual([
        'accessCount',
        'accessDate',
        'createDate',
        'url',
      ]);
      expect(attributes.url).toEqual(URL);
    });

    it('gracefully handles version conflict', async () => {
      const error = savedObjectsClient.errors.decorateConflictError(new Error());
      savedObjectsClient.create.throws(error);
      const id = await shortUrl.generateUrlId(URL, req);
      expect(id).toEqual(ID);
    });
  });

  describe('getUrl', () => {
    beforeEach(() => {
      const attributes = { accessCount: 2, url: URL };
      savedObjectsClient.get.returns({ id: ID, attributes });
    });

    it('provides the ID to savedObjectsClient', async () => {
      await shortUrl.getUrl(ID, req);

      sinon.assert.calledOnce(savedObjectsClient.get);
      const [type, id] = savedObjectsClient.get.getCall(0).args;

      expect(type).toEqual(TYPE);
      expect(id).toEqual(ID);
    });

    it('returns the url', async () => {
      const response = await shortUrl.getUrl(ID, req);
      expect(response).toEqual(URL);
    });

    it('increments accessCount', async () => {
      await shortUrl.getUrl(ID, req);

      sinon.assert.calledOnce(savedObjectsClient.update);
      const [type, id, attributes] = savedObjectsClient.update.getCall(0).args;

      expect(type).toEqual(TYPE);
      expect(id).toEqual(ID);
      expect(Object.keys(attributes).sort()).toEqual(['accessCount', 'accessDate']);
      expect(attributes.accessCount).toEqual(3);
    });
  });
});
