/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { kibanaResponseFactory } from '@kbn/core-http-router-server-internal';
import { registerTranslationsRoute } from './translations';

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  open: jest.fn(),
}));

jest.mock('@kbn/i18n', () => ({
  i18n: {
    getTranslation: jest.fn().mockReturnValue({ locale: 'en', messages: {} }),
  },
  i18nLoader: {
    getTranslationsByLocale: jest.fn(),
  },
}));

import { open } from 'fs/promises';
import { i18n } from '@kbn/i18n';

const openMock = open as jest.MockedFunction<typeof open>;
const getTranslationMock = i18n.getTranslation as jest.Mock;

const buildHandler = (opts: Omit<Parameters<typeof registerTranslationsRoute>[0], 'router'>) => {
  const router = mockRouter.create();
  registerTranslationsRoute({ ...opts, router });
  // The hashless route is registered first; return its handler.
  return (router.get as jest.Mock).mock.calls[0][1] as Function;
};

const makeRequest = (locale: string, translationHash?: string) => ({
  params: { locale, translationHash },
});

const makeResponse = () => {
  const ok = jest.fn((payload: unknown) => payload);
  const notFound = jest.fn((payload: unknown) => payload);
  return { ok, notFound };
};

const makeReadable = (content: string): Readable => {
  const readable = new Readable({ read() {} });
  readable.push(content);
  readable.push(null);
  return readable;
};

const collectStream = (stream: Readable): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });

const mockOpenWithContent = (content: string) => {
  const handle = {
    createReadStream: () => makeReadable(content),
    close: jest.fn().mockResolvedValue(undefined),
  } as unknown as Awaited<ReturnType<typeof open>>;
  openMock.mockResolvedValue(handle);
  return handle;
};

describe('registerTranslationsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenWithContent('');
    getTranslationMock.mockReturnValue({ locale: 'en', messages: {} });
  });

  test('registers route with expected options', () => {
    const router = mockRouter.create();
    registerTranslationsRoute({
      router,
      locale: 'en',
      isDist: true,
      translationHashes: { en: 'XXXX' },
      localeFileMap: {},
    });
    expect(router.get).toHaveBeenCalledTimes(2);
    expect(router.get).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: '/translations/{locale}.json',
        options: {
          access: 'public',
          excludeFromRateLimiter: true,
          httpResource: true,
        },
        security: expect.objectContaining({
          authc: expect.objectContaining({ enabled: false }),
        }),
      }),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: '/translations/{translationHash}/{locale}.json',
        options: {
          access: 'public',
          excludeFromRateLimiter: true,
          httpResource: true,
        },
        security: expect.objectContaining({
          authc: expect.objectContaining({ enabled: false }),
        }),
      }),
      expect.any(Function)
    );
  });

  test('returns 404 for a stale hash even when the locale uses non-canonical casing', async () => {
    const router = mockRouter.create();
    registerTranslationsRoute({
      router,
      locale: 'en',
      isDist: true,
      translationHashes: { en: 'GOODHASH' },
      localeFileMap: {},
    });

    // Both registered route paths share the same handler logic; either is
    // fine to drive. Use the hashed-path handler since it's the one that
    // exercises the stale-hash check.
    const [, hashedPathHandler] = router.get.mock.calls[1];

    const request = httpServerMock.createKibanaRequest({
      params: { locale: 'EN', translationHash: 'BADHASH' },
    });
    const response = await hashedPathHandler({} as any, request, kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect((response.payload as any) ?? response.payload).toEqual(
      expect.stringContaining('Stale translation hash')
    );
  });

  describe('route handler', () => {
    const defaultOpts = {
      locale: 'en',
      isDist: false,
      translationHashes: { en: 'hash-en', 'fr-FR': 'hash-fr' },
      localeFileMap: { 'fr-FR': ['/translations/fr-FR.json'] },
    };

    test('returns 404 for unknown locale', async () => {
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('de-DE'), res);
      expect(res.notFound).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.stringContaining('Unknown locale') })
      );
    });

    test('returns 404 for stale hash in URL', async () => {
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('fr-FR', 'stale-hash'), res);
      expect(res.notFound).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.stringContaining('Stale translation hash') })
      );
    });

    test('serves default locale from memory without reading files', async () => {
      getTranslationMock.mockReturnValue({ locale: 'en', messages: { key: 'value' } });
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('en'), res);
      expect(openMock).not.toHaveBeenCalled();
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      expect(JSON.parse(body)).toEqual({ locale: 'en', messages: { key: 'value' } });
    });

    test('serves non-default single-file locale by streaming the file', async () => {
      const fileContent = '{"locale":"fr-FR","formats":{},"messages":{"key":"valeur"}}';
      mockOpenWithContent(fileContent);
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('fr-FR'), res);
      expect(openMock).toHaveBeenCalledWith('/translations/fr-FR.json', 'r');
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      expect(body).toBeInstanceOf(Readable);
      const content = await collectStream(body);
      expect(JSON.parse(content)).toEqual({
        locale: 'fr-FR',
        formats: {},
        messages: { key: 'valeur' },
      });
    });

    test('propagates open errors before committing the response', async () => {
      openMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await expect(handler({}, makeRequest('fr-FR'), res)).rejects.toThrow('ENOENT');
      expect(res.ok).not.toHaveBeenCalled();
    });

    test('streams translation file content without modifying it', async () => {
      mockOpenWithContent('{}');
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('fr-FR'), res);
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      const content = await collectStream(body);
      expect(JSON.parse(content)).toEqual({});
    });

    test('locale lookup is case-insensitive', async () => {
      const fileContent = '{"locale":"fr-FR","messages":{}}';
      mockOpenWithContent(fileContent);
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('fr-fr'), res);
      expect(openMock).toHaveBeenCalledWith('/translations/fr-FR.json', 'r');
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      const content = await collectStream(body);
      expect(JSON.parse(content).locale).toBe('fr-FR');
    });
  });
});
