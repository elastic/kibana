/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
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

          let body: string;
          if (canonicalLocale.toLowerCase() === locale.toLowerCase()) {
            // Default locale: already in memory from server startup
            body = JSON.stringify(i18n.getTranslation());
          } else {
            const files = localeFileMap[canonicalLocale] ?? [];
            if (files.length === 1) {
              // Single pre-merged file (standard case): inject locale field via string
              // splice and serve without parsing or caching the content.
              // Strip the outer braces and only add the comma when inner content exists,
              // so an empty file ({}) doesn't produce the invalid {"locale":"xx",}.
              const raw = await readFile(files[0], 'utf8');
              const inner = raw.trim().slice(1, -1);
              body = inner
                ? `{"locale":${JSON.stringify(canonicalLocale)},${inner}}`
                : `{"locale":${JSON.stringify(canonicalLocale)}}`;
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
