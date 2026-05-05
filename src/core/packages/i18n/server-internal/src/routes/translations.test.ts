/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { registerTranslationsRoute } from './translations';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.mock('@kbn/i18n', () => ({
  i18n: {
    getTranslation: jest.fn().mockReturnValue({ locale: 'en', messages: {} }),
  },
  i18nLoader: {
    getTranslationsByLocale: jest.fn(),
  },
}));

import { readFile } from 'fs/promises';
import { i18n } from '@kbn/i18n';

const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
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

describe('registerTranslationsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readFileMock.mockResolvedValue('' as any);
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
      expect(readFileMock).not.toHaveBeenCalled();
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      expect(JSON.parse(body)).toEqual({ locale: 'en', messages: { key: 'value' } });
    });

    test('serves non-default locale by reading file and injecting locale field', async () => {
      readFileMock.mockResolvedValue('{"formats":{},"messages":{"key":"valeur"}}' as any);
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('fr-FR'), res);
      expect(readFileMock).toHaveBeenCalledWith('/translations/fr-FR.json', 'utf8');
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      expect(JSON.parse(body)).toEqual({
        locale: 'fr-FR',
        formats: {},
        messages: { key: 'valeur' },
      });
    });

    test('produces valid JSON when translation file is empty ({})', async () => {
      readFileMock.mockResolvedValue('{}' as any);
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('fr-FR'), res);
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      expect(() => JSON.parse(body)).not.toThrow();
      expect(JSON.parse(body)).toEqual({ locale: 'fr-FR' });
    });

    test('locale lookup is case-insensitive', async () => {
      readFileMock.mockResolvedValue('{"messages":{}}' as any);
      const handler = buildHandler(defaultOpts);
      const res = makeResponse();
      await handler({}, makeRequest('fr-fr'), res);
      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      expect(JSON.parse(body).locale).toBe('fr-FR');
    });
  });
});
