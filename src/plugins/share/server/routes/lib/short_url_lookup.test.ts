/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { shortUrlLookupProvider, ShortUrlLookupService, UrlAttributes } from './short_url_lookup';
import { SavedObjectsClientContract, SavedObject } from 'kibana/server';

import { savedObjectsClientMock, loggingSystemMock } from '../../../../../core/server/mocks';

describe('shortUrlLookupProvider', () => {
  const ID = 'bf00ad16941fc51420f91a93428b27a0';
  const TYPE = 'url';
  const URL = 'http://elastic.co';

  let savedObjects: jest.Mocked<SavedObjectsClientContract>;
  let deps: { savedObjects: SavedObjectsClientContract };
  let shortUrl: ShortUrlLookupService;

  beforeEach(() => {
    savedObjects = savedObjectsClientMock.create();
    savedObjects.create.mockResolvedValue({ id: ID } as SavedObject<UrlAttributes>);
    deps = { savedObjects };
    shortUrl = shortUrlLookupProvider({ logger: loggingSystemMock.create().get() });
  });

  describe('generateUrlId', () => {
    it('returns the document id', async () => {
      const id = await shortUrl.generateUrlId(URL, deps);
      expect(id).toEqual(ID);
    });

    it('provides correct arguments to savedObjectsClient', async () => {
      await shortUrl.generateUrlId(URL, { savedObjects });

      expect(savedObjects.create).toHaveBeenCalledTimes(1);
      const [type, attributes, options] = savedObjects.create.mock.calls[0];

      expect(type).toEqual(TYPE);
      expect(Object.keys(attributes as UrlAttributes).sort()).toEqual([
        'accessCount',
        'accessDate',
        'createDate',
        'url',
      ]);
      expect((attributes as UrlAttributes).url).toEqual(URL);
      expect(options!.id).toEqual(ID);
    });

    it('passes persists attributes', async () => {
      await shortUrl.generateUrlId(URL, deps);

      expect(savedObjects.create).toHaveBeenCalledTimes(1);
      const [type, attributes] = savedObjects.create.mock.calls[0];

      expect(type).toEqual(TYPE);
      expect(Object.keys(attributes as UrlAttributes).sort()).toEqual([
        'accessCount',
        'accessDate',
        'createDate',
        'url',
      ]);
      expect((attributes as UrlAttributes).url).toEqual(URL);
    });

    it('gracefully handles version conflict', async () => {
      const error = savedObjects.errors.decorateConflictError(new Error());
      savedObjects.create.mockImplementation(() => {
        throw error;
      });
      const id = await shortUrl.generateUrlId(URL, deps);
      expect(id).toEqual(ID);
    });
  });

  describe('getUrl', () => {
    beforeEach(() => {
      const attributes = { accessCount: 2, url: URL };
      savedObjects.get.mockResolvedValue({ id: ID, attributes, type: 'url', references: [] });
    });

    it('provides the ID to savedObjectsClient', async () => {
      await shortUrl.getUrl(ID, { savedObjects });

      expect(savedObjects.get).toHaveBeenCalledTimes(1);
      expect(savedObjects.get).toHaveBeenCalledWith(TYPE, ID);
    });

    it('returns the url', async () => {
      const response = await shortUrl.getUrl(ID, deps);
      expect(response).toEqual(URL);
    });

    it('increments accessCount', async () => {
      await shortUrl.getUrl(ID, { savedObjects });

      expect(savedObjects.update).toHaveBeenCalledTimes(1);

      const [type, id, attributes] = savedObjects.update.mock.calls[0];

      expect(type).toEqual(TYPE);
      expect(id).toEqual(ID);
      expect(Object.keys(attributes).sort()).toEqual(['accessCount', 'accessDate']);
      expect((attributes as UrlAttributes).accessCount).toEqual(3);
    });
  });
});
