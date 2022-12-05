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
import type { IRouter } from '@kbn/core-http-server';

interface TranslationCache {
  translations: string;
  hash: string;
}

export const registerTranslationsRoute = (router: IRouter) => {
  const translationCache: Record<string, TranslationCache> = {};

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
      const requestedLocale = req.params.locale.toLowerCase();

      if (!translationCache[requestedLocale]) {
        const translations = JSON.stringify(i18n.getTranslation(requestedLocale));
        const hash = createHash('sha1').update(translations).digest('hex');
        translationCache[requestedLocale] = {
          translations,
          hash,
        };
      }
      return res.ok({
        headers: {
          'content-type': 'application/json',
          'cache-control': 'must-revalidate',
          etag: translationCache[requestedLocale].hash,
        },
        body: translationCache[requestedLocale].translations,
      });
    }
  );
};
