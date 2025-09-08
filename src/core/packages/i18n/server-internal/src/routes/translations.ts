/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18nLoader } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core-http-server';
import { createHash } from 'crypto';
import { getKibanaTranslationFiles } from '../get_kibana_translation_files';
import { supportedLocale } from '../constants';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface TranslationCache {
  translations: string;
  hash: string;
}

export const registerTranslationsRoute = ({
  router,
  pluginPaths,
  isDist,
  defaultLocale,
}: {
  router: IRouter;
  pluginPaths: string[];
  isDist: boolean;
  defaultLocale: string;
}) => {
  const translationCacheByLocale: Record<string, TranslationCache> = {};

  const canonicalize = (tag: string) => {
    const parts = tag.split('-');

    if (parts.length === 1) {
      return parts[0].toLowerCase();
    }

    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  };

  const resolveAvailableLocale = async (requested: string): Promise<string> => {
    const canonicalRequested = canonicalize(requested);
    // 1) Try exact requested (canonicalized)
    if ((await getKibanaTranslationFiles(canonicalRequested, pluginPaths)).length) {
      return canonicalRequested;
    }

    // 2) If base language only (e.g. fr), try a supported region variant (e.g. fr-FR)
    const base = canonicalRequested.split('-')[0];
    const supportedVariant = supportedLocale.find((loc) => {
      const lower = loc.toLowerCase();
      return lower === base || lower.startsWith(`${base}-`);
    });

    if (supportedVariant) {
      const variantCanonical = canonicalize(supportedVariant);
      if ((await getKibanaTranslationFiles(variantCanonical, pluginPaths)).length) {
        return variantCanonical;
      }
    }

    // 3) Try raw requested as-is (in case file names already match unusual casing)
    if ((await getKibanaTranslationFiles(requested, pluginPaths)).length) {
      return requested;
    }

    // 4) Fallback to default
    return defaultLocale;
  };

  // Support both hashed and non-hashed URL shapes. The "hash" segment is ignored here and
  // retained only for backward-compatibility with previously generated URLs.
  const paths = ['/translations/{locale}.json', '/translations/{hash}/{locale}.json'];

  paths.forEach((routePath) => {
    router.get(
      {
        path: routePath,
        security: {
          authz: {
            enabled: false,
            reason: 'This route is only used for serving i18n translations.',
          },
        },
        validate: {
          params: schema.object({
            // optional hash segment for compatibility; not used in handler
            hash: schema.maybe(schema.string()),
            locale: schema.string(),
          }),
        },
        options: {
          access: 'public',
          httpResource: true,
          authRequired: false,
          excludeFromRateLimiter: true,
        },
      },
      async (_ctx, req, res) => {
        const requestedLocale = req.params.locale || defaultLocale;
        const effectiveLocale = await resolveAvailableLocale(requestedLocale);
        const cacheKey = effectiveLocale.toLowerCase();

        if (!translationCacheByLocale[cacheKey]) {
          const translationFiles = await getKibanaTranslationFiles(effectiveLocale, pluginPaths);
          if (translationFiles.length) {
            i18nLoader.registerTranslationFiles(translationFiles);
          }

          const translationInput = await i18nLoader.getTranslationsByLocale(effectiveLocale);
          const translations = JSON.stringify(translationInput);
          const hash = createHash('sha256').update(translations).digest('hex').slice(0, 12);

          translationCacheByLocale[cacheKey] = {
            translations,
            hash,
          };
        }

        const { translations, hash } = translationCacheByLocale[cacheKey];

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
            etag: hash,
          };
        }

        return res.ok({
          headers,
          body: translations,
        });
      }
    );
  });
};
