/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from '@kbn/kibana-utils-plugin';
import {
  KibanaLocation,
  Locator,
  LocatorGetUrlParams,
  UrlService,
} from '../../../common/url_service';
import {
  LegacyShortUrlLocatorDefinition,
  LegacyShortUrlLocatorParams,
  LEGACY_SHORT_URL_LOCATOR_ID,
} from '../../../common/url_service/locators/legacy_short_url_locator';
import { ShortUrlRedirectLocatorDefinition } from '../../../common/url_service/locators/short_url_redirect_locator';
import { BrowserShortUrlClientHttp, BrowserShortUrlClient } from './short_url_client';
import {
  BrowserShortUrlClientFactory,
  BrowserShortUrlClientFactoryCreateParams,
} from './short_url_client_factory';

const setup = () => {
  const navigate = jest.fn(async () => {});
  const getUrl = jest.fn(
    async (location: KibanaLocation, params: LocatorGetUrlParams): Promise<string> => {
      return `${params.absolute ? 'https://example.com' : ''}/xyz/${location.app}/${location.path}`;
    }
  );
  const http: BrowserShortUrlClientHttp = {
    basePath: {
      get: () => '/xyz',
    },
    fetch: jest.fn(async () => {
      return {} as any;
    }),
  };
  const service = new UrlService<BrowserShortUrlClientFactoryCreateParams, BrowserShortUrlClient>({
    baseUrl: '/xyz',
    version: '1.2.3',
    navigate,
    getUrl,
    shortUrls: ({ locators }) =>
      new BrowserShortUrlClientFactory({
        http,
        locators,
      }),
  });

  service.locators.create(new LegacyShortUrlLocatorDefinition());
  service.locators.create(new ShortUrlRedirectLocatorDefinition());

  const legacyShortUrlLocator = service.locators.get<LegacyShortUrlLocatorParams>(
    LEGACY_SHORT_URL_LOCATOR_ID
  )!;

  return {
    service,
    navigate,
    getUrl,
    http,
    legacyShortUrlLocator,
  };
};

describe('create()', () => {
  test('calls HTTP short URL creation endpoint', async () => {
    const { service, http, legacyShortUrlLocator } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    await service.shortUrls.get(null).create<LegacyShortUrlLocatorParams>({
      locator: legacyShortUrlLocator!,
      params: {
        url: 'https://example.com/foo/bar',
      },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/short_url', {
      method: 'POST',
      body: expect.any(String),
    });
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toStrictEqual({
      humanReadableSlug: false,
      locatorId: LEGACY_SHORT_URL_LOCATOR_ID,
      params: {
        url: 'https://example.com/foo/bar',
      },
    });
  });

  test('returns the short URL object', async () => {
    const { service, http } = setup();
    const legacyShortUrlLocator = service.locators.get<LegacyShortUrlLocatorParams>(
      LEGACY_SHORT_URL_LOCATOR_ID
    );
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;
    const shortUrlData = {
      id: '123',
      slug: 'yellow-orange-tomato',
      accessCount: 0,
      accessDate: 1600000000000,
      createDate: 1600000000000,
      locator: {
        id: LEGACY_SHORT_URL_LOCATOR_ID,
        state: {
          url: 'https://example.com/foo/bar',
        },
      },
    };

    fetchSpy.mockImplementation(async () => {
      return shortUrlData;
    });

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    const shortUrl = await service.shortUrls.get(null).create<LegacyShortUrlLocatorParams>({
      locator: legacyShortUrlLocator!,
      params: {
        url: 'https://example.com/foo/bar',
      },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(shortUrl.data).toMatchObject(shortUrlData);
  });

  test('passes through error thrown by HTTP client', async () => {
    const { service, http, legacyShortUrlLocator } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;
    const error = { message: 'Something went wrong...' };

    fetchSpy.mockImplementation(async () => {
      throw error;
    });

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    const [, err] = await of(
      service.shortUrls.get(null).create<LegacyShortUrlLocatorParams>({
        locator: legacyShortUrlLocator!,
        params: {
          url: 'https://example.com/foo/bar',
        },
      })
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(err).toStrictEqual(error);
  });
});

describe('createFromLongUrl()', () => {
  test('calls HTTP short URL creation endpoint', async () => {
    const { service, http } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    await service.shortUrls.get(null).createFromLongUrl('https://www.example.com/a/b/c');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/short_url', {
      method: 'POST',
      body: expect.any(String),
    });
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toStrictEqual({
      humanReadableSlug: true,
      locatorId: LEGACY_SHORT_URL_LOCATOR_ID,
      params: {
        url: '/a/b/c',
      },
    });
  });

  test('returns the short URL object and additional data', async () => {
    const { service, http } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;
    const shortUrlData = {
      id: '123',
      slug: 'yellow-orange-tomato',
      accessCount: 0,
      accessDate: 1600000000000,
      createDate: 1600000000000,
      locator: {
        id: LEGACY_SHORT_URL_LOCATOR_ID,
        state: {
          url: 'https://example.com/foo/bar',
        },
      },
    };

    fetchSpy.mockImplementation(async () => {
      return shortUrlData;
    });

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    const shortUrl = await service.shortUrls
      .get(null)
      .createFromLongUrl('https://www.example.com/a/b/c');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(shortUrl.data).toMatchObject(shortUrlData);
    expect(shortUrl.locator).toBeInstanceOf(Locator);
    expect(shortUrl.params).toStrictEqual({
      slug: 'yellow-orange-tomato',
    });
    expect(shortUrl.url).toBe('https://example.com/xyz/r/s/yellow-orange-tomato');
  });
});

describe('get()', () => {
  test('calls HTTP "get" endpoint', async () => {
    const { service, http } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    await service.shortUrls.get(null).get('foobar');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/short_url/foobar', {
      method: 'GET',
    });
  });

  test('returns data returned by the "get" endpoint', async () => {
    const { service, http } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;
    const shortUrlData = {
      id: '123',
      slug: 'yellow-orange-tomato',
      accessCount: 0,
      accessDate: 1600000000000,
      createDate: 1600000000000,
      locator: {
        id: LEGACY_SHORT_URL_LOCATOR_ID,
        state: {
          url: 'https://example.com/foo/bar',
        },
      },
    };

    fetchSpy.mockImplementation(async () => {
      return shortUrlData;
    });

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    const shortUrl = await service.shortUrls.get(null).get('foobar');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(shortUrl.data).toStrictEqual(shortUrlData);
  });

  test('passes through error thrown by HTTP client', async () => {
    const { service, http } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;
    const error = { message: 'Something went wrong...' };

    fetchSpy.mockImplementation(async () => {
      throw error;
    });

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    const [, err] = await of(service.shortUrls.get(null).get('foobar'));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(err).toStrictEqual(error);
  });
});

describe('resolve()', () => {
  test('calls HTTP "resolve" endpoint', async () => {
    const { service, http } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    await service.shortUrls.get(null).resolve('pink-orange-tomato');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/short_url/_slug/pink-orange-tomato', {
      method: 'GET',
    });
  });

  test('returns data returned by the "resolve" endpoint', async () => {
    const { service, http } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;
    const shortUrlData = {
      id: '123',
      slug: 'yellow-orange-tomato',
      accessCount: 0,
      accessDate: 1600000000000,
      createDate: 1600000000000,
      locator: {
        id: LEGACY_SHORT_URL_LOCATOR_ID,
        state: {
          url: 'https://example.com/foo/bar',
        },
      },
    };

    fetchSpy.mockImplementation(async () => {
      return shortUrlData;
    });

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    const shortUrl = await service.shortUrls.get(null).resolve('pink-orange-tomato');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(shortUrl.data).toStrictEqual(shortUrlData);
  });

  test('passes through error thrown by HTTP client', async () => {
    const { service, http } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;
    const error = { message: 'Something went wrong...' };

    fetchSpy.mockImplementation(async () => {
      throw error;
    });

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    const [, err] = await of(service.shortUrls.get(null).resolve('pink-orange-tomato'));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(err).toStrictEqual(error);
  });
});

describe('delete()', () => {
  test('calls the HTTP endpoint', async () => {
    const { service, http } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    await service.shortUrls.get(null).delete('foobar');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/short_url/foobar', {
      method: 'DELETE',
    });
  });

  test('passes through error thrown by HTTP client', async () => {
    const { service, http } = setup();
    const fetchSpy = http.fetch as unknown as jest.SpyInstance;
    const error = { message: 'Something went wrong...' };

    fetchSpy.mockImplementation(async () => {
      throw error;
    });

    expect(fetchSpy).toHaveBeenCalledTimes(0);

    const [, err] = await of(service.shortUrls.get(null).delete('foobar'));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(err).toStrictEqual(error);
  });
});
