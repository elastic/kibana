/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
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
  translationHash,
  isDist,
}: {
  router: IRouter;
  locale: string;
  translationHash: string;
  isDist: boolean;
}) => {
  let translationCache: TranslationCache;

  ['/translations/{locale}.json', `/translations/${translationHash}/{locale}.json`].forEach(
    (routePath) => {
      router.get(
        {
          path: routePath,
          validate: {
            params: schema.object({
              locale: schema.string(),
            }),
          },
          options: {
            access: 'public',
            authRequired: false,
          },
        },
        (ctx, req, res) => {
          if (req.params.locale.toLowerCase() !== locale.toLowerCase()) {
            return res.notFound({
              body: `Unknown locale: ${req.params.locale}`,
            });
          }
          if (!translationCache) {
            const translations = JSON.stringify(i18n.getTranslation());
            translationCache = {
              translations,
              hash: translationHash,
            };
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
              etag: translationCache.hash,
            };
          }

          return res.ok({
            headers,
            body: translationCache.translations,
          });
        }
      );
    }
  );
};
