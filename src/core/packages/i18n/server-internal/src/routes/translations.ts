/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createReadStream } from 'fs';
import { PassThrough } from 'stream';
import { i18n, i18nLoader } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core-http-server';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const registerTranslationsRoute = ({
  router,
  locale,
  translationHashes,
  localeFileMap,
  isDist,
}: {
  router: IRouter;
  locale: string;
  translationHashes: Record<string, string>;
  localeFileMap: Record<string, string[]>;
  isDist: boolean;
}) => {
  const supportedLocales = Object.keys(translationHashes);

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
          // Find the canonical-cased locale key (e.g. 'fr-FR' not 'fr-fr')
          const canonicalLocale = supportedLocales.find((s) => s.toLowerCase() === requestedLocale);
          if (!canonicalLocale) {
            return res.notFound({
              body: `Unknown locale: ${req.params.locale}`,
            });
          }

          // Validate the translation hash if provided in the URL
          const requestedHash = req.params.translationHash;
          const expectedHash = translationHashes[canonicalLocale];
          if (requestedHash && expectedHash && requestedHash !== expectedHash) {
            return res.notFound({
              body: `Stale translation hash for locale: ${req.params.locale}`,
            });
          }

          let body: string | PassThrough;
          if (canonicalLocale.toLowerCase() === locale.toLowerCase()) {
            // Default locale: already in memory from server startup
            body = JSON.stringify(i18n.getTranslation());
          } else {
            const files = localeFileMap[canonicalLocale] ?? [];
            if (files.length === 1) {
              // Single pre-merged file streamed directly. The i18n tooling
              // (serializeToJson) always writes a top-level "locale" field, so we don't
              // re-parse here. An empty `{}` file would be served as-is without a locale.
              const stream = new PassThrough();
              createReadStream(files[0]).pipe(stream);
              body = stream;
            } else {
              // Multiple files (external plugin contributed translations): merge via
              // the loader and serve without caching.
              const translationData = await i18nLoader.getTranslationsByLocale(canonicalLocale);
              translationData.locale = canonicalLocale;
              body = JSON.stringify(translationData);
            }
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
              etag: expectedHash,
            };
          }

          return res.ok({ headers, body });
        }
      );
    }
  );
};
