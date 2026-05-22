/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable, PassThrough } from 'stream';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { registerTranslationsRoute } from './translations';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn(),
}));

jest.mock('@kbn/i18n', () => ({
  i18n: {
    getTranslation: jest.fn().mockReturnValue({ locale: 'en', messages: {} }),
  },
  i18nLoader: {
    getTranslationsByLocale: jest.fn(),
  },
}));

import { createReadStream } from 'fs';
import { i18n } from '@kbn/i18n';

const createReadStreamMock = createReadStream as jest.MockedFunction<typeof createReadStream>;
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

const collectStream = (stream: PassThrough): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });

describe('registerTranslationsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createReadStreamMock.mockReturnValue(makeReadable('') as any);
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
      expect(createReadStreamMock).not.toHaveBeenCalled();
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      expect(JSON.parse(body)).toEqual({ locale: 'en', messages: { key: 'value' } });
    });

    test('serves non-default single-file locale by streaming the file', async () => {
      const fileContent = '{"locale":"fr-FR","formats":{},"messages":{"key":"valeur"}}';
      createReadStreamMock.mockReturnValue(makeReadable(fileContent) as any);
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('fr-FR'), res);
      expect(createReadStreamMock).toHaveBeenCalledWith('/translations/fr-FR.json');
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      expect(body).toBeInstanceOf(PassThrough);
      const content = await collectStream(body);
      expect(JSON.parse(content)).toEqual({
        locale: 'fr-FR',
        formats: {},
        messages: { key: 'valeur' },
      });
    });

    test('locale lookup is case-insensitive', async () => {
      const fileContent = '{"locale":"fr-FR","messages":{}}';
      createReadStreamMock.mockReturnValue(makeReadable(fileContent) as any);
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('fr-fr'), res);
      expect(createReadStreamMock).toHaveBeenCalledWith('/translations/fr-FR.json');
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      const content = await collectStream(body);
      expect(JSON.parse(content).locale).toBe('fr-FR');
    });
  });
});
