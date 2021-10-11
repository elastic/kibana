/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ServerShortUrlClientFactory } from './short_url_client_factory';
import { UrlService } from '../../../common/url_service';
import { LegacyShortUrlLocatorDefinition } from '../../../common/url_service/locators/legacy_short_url_locator';
import { MemoryShortUrlStorage } from './storage/memory_short_url_storage';

const setup = () => {
  const currentVersion = '1.2.3';
  const service = new UrlService({
    getUrl: () => {
      throw new Error('Not implemented.');
    },
    navigate: () => {
      throw new Error('Not implemented.');
    },
    shortUrls: new ServerShortUrlClientFactory({
      currentVersion,
    }),
  });
  const definition = new LegacyShortUrlLocatorDefinition();
  const locator = service.locators.create(definition);
  const storage = new MemoryShortUrlStorage();
  const client = service.shortUrls.get({ storage });

  return {
    service,
    client,
    storage,
    locator,
    definition,
    currentVersion,
  };
};

describe('ServerShortUrlClient', () => {
  describe('.create()', () => {
    test('can create a short URL', async () => {
      const { client, locator, currentVersion } = setup();
      const shortUrl = await client.create({
        locator,
        params: {
          url: '/app/test#foo/bar/baz',
        },
      });

      expect(shortUrl).toMatchObject({
        data: {
          accessCount: 0,
          accessDate: expect.any(Number),
          createDate: expect.any(Number),
          slug: expect.any(String),
          locator: {
            id: locator.id,
            version: currentVersion,
            state: {
              url: '/app/test#foo/bar/baz',
            },
          },
          id: expect.any(String),
        },
      });
    });
  });

  describe('.resolve()', () => {
    test('can get short URL by its slug', async () => {
      const { client, locator } = setup();
      const shortUrl1 = await client.create({
        locator,
        params: {
          url: '/app/test#foo/bar/baz',
        },
      });
      const shortUrl2 = await client.resolve(shortUrl1.data.slug);

      expect(shortUrl2.data).toMatchObject(shortUrl1.data);
    });

    test('can create short URL with custom slug', async () => {
      const { client, locator } = setup();
      await client.create({
        locator,
        params: {
          url: '/app/test#foo/bar/baz',
        },
      });
      const shortUrl1 = await client.create({
        locator,
        slug: 'foo-bar',
        params: {
          url: '/app/test#foo/bar/baz',
        },
      });
      const shortUrl2 = await client.resolve('foo-bar');

      expect(shortUrl2.data).toMatchObject(shortUrl1.data);
    });

    test('cannot create short URL with the same slug', async () => {
      const { client, locator } = setup();
      await client.create({
        locator,
        slug: 'lala',
        params: {
          url: '/app/test#foo/bar/baz',
        },
      });

      await expect(
        client.create({
          locator,
          slug: 'lala',
          params: {
            url: '/app/test#foo/bar/baz',
          },
        })
      ).rejects.toThrowError(new Error(`Slug "lala" already exists.`));
    });

    test('can automatically generate human-readable slug', async () => {
      const { client, locator } = setup();
      const shortUrl = await client.create({
        locator,
        humanReadableSlug: true,
        params: {
          url: '/app/test#foo/bar/baz',
        },
      });

      expect(shortUrl.data.slug.split('-').length).toBe(3);
    });
  });

  describe('.get()', () => {
    test('can fetch created short URL', async () => {
      const { client, locator } = setup();
      const shortUrl1 = await client.create({
        locator,
        params: {
          url: '/app/test#foo/bar/baz',
        },
      });
      const shortUrl2 = await client.get(shortUrl1.data.id);

      expect(shortUrl2.data).toMatchObject(shortUrl1.data);
    });

    test('throws when fetching non-existing short URL', async () => {
      const { client } = setup();

      await expect(() => client.get('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')).rejects.toThrowError(
        new Error(`No short url with id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`)
      );
    });
  });

  describe('.delete()', () => {
    test('can delete an existing short URL', async () => {
      const { client, locator } = setup();
      const shortUrl1 = await client.create({
        locator,
        params: {
          url: '/app/test#foo/bar/baz',
        },
      });
      await client.delete(shortUrl1.data.id);

      await expect(() => client.get(shortUrl1.data.id)).rejects.toThrowError(
        new Error(`No short url with id "${shortUrl1.data.id}"`)
      );
    });
  });
});
