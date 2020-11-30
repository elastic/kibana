/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
