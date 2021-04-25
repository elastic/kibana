/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHash } from 'crypto';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';

interface TranslationCache {
  translations: string;
  hash: string;
}

export const registerTranslationsRoute = (router: IRouter, locale: string) => {
  let translationCache: TranslationCache;

  router.get(
    {
      path: '/translations/{locale}.json',
      validate: {
        params: schema.object({
          locale: schema.string(),
        }),
      },
      options: {
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
        const hash = createHash('sha1').update(translations).digest('hex');
        translationCache = {
          translations,
          hash,
        };
      }
      return res.ok({
        headers: {
          'content-type': 'application/json',
          'cache-control': 'must-revalidate',
          etag: translationCache.hash,
        },
        body: translationCache.translations,
      });
    }
  );
};
