/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import { i18n, i18nLoader } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core-http-server';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface TranslationCache {
  translations: string;
  hash: string;
}

export const registerTranslationsRoute = ({
  router,
  locale,
  translationHashes,
  isDist,
}: {
  router: IRouter;
  locale: string;
  translationHashes: Record<string, string>;
  isDist: boolean;
}) => {
  const supportedLocales = Object.keys(translationHashes);
  const translationCaches = new Map<string, TranslationCache>();

  ['/translations/{locale}.json', `/translations/{translationHash}/{locale}.json`].forEach(
    (routePath) => {
      router.get(
        {
          path: routePath,
          security: {
            authc: {
              enabled: false,
              reason:
                'This route serves i18n translation files that must be accessible without authentication.',
            },
            authz: {
              enabled: false,
              reason: 'This route is only used for serving i18n translations.',
            },
          },
          validate: {
            params: schema.object({
              locale: schema.string(),
              translationHash: schema.maybe(schema.string()),
            }),
          },
          options: {
            access: 'public',
            httpResource: true,
            excludeFromRateLimiter: true,
          },
        },
        async (_ctx, req, res) => {
          const requestedLocale = req.params.locale.toLowerCase();
          if (!supportedLocales.some((supported) => supported.toLowerCase() === requestedLocale)) {
            return res.notFound({
              body: `Unknown locale: ${req.params.locale}`,
            });
          }

          // Validate the translation hash if provided in the URL
          const requestedHash = req.params.translationHash;
          const expectedHash = translationHashes[req.params.locale];
          if (requestedHash && expectedHash && requestedHash !== expectedHash) {
            return res.notFound({
              body: `Stale translation hash for locale: ${req.params.locale}`,
            });
          }

          let cached = translationCaches.get(requestedLocale);
          if (!cached) {
            let translations: string;
            if (requestedLocale === locale.toLowerCase()) {
              // Default locale: use the already-initialized global translations
              translations = JSON.stringify(i18n.getTranslation());
            } else {
              // Other locale: lazily load from disk via the loader
              const translationData = await i18nLoader.getTranslationsByLocale(req.params.locale);
              translationData.locale = req.params.locale;
              translations = JSON.stringify(translationData);
            }
            const hash = createHash('sha256').update(translations).digest('hex').slice(0, 12);
            cached = { translations, hash };
            translationCaches.set(requestedLocale, cached);
          }

          let headers: Record<string, string>;
          if (isDist) {
            headers = {
              'content-type': 'application/json',
              'cache-control': `public, max-age=${365 * DAY}, immutable`,
            };
          } else {
            headers = {
              'content-type': 'application/json',
              'cache-control': 'must-revalidate',
              etag: cached.hash,
            };
          }

          return res.ok({
            headers,
            body: cached.translations,
          });
        }
      );
    }
  );
};
