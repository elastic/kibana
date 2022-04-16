/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18nLoader } from '@kbn/i18n';
import { size } from 'lodash';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { I18nServiceSetup } from '@kbn/core/server';
import { getIntegrityHashes, Integrities } from './file_integrity';

export interface UsageStats {
  locale: string;
  integrities: Integrities;
  labelsCount?: number;
}

export async function getTranslationCount(
  loader: typeof i18nLoader,
  locale: string
): Promise<number> {
  const translations = await loader.getTranslationsByLocale(locale);
  return size(translations.messages);
}

export function createCollectorFetch({ getLocale, getTranslationFiles }: I18nServiceSetup) {
  return async function fetchUsageStats(): Promise<UsageStats> {
    const locale = getLocale();
    const translationFilePaths: string[] = getTranslationFiles();

    const [labelsCount, integrities] = await Promise.all([
      getTranslationCount(i18nLoader, locale),
      getIntegrityHashes(translationFilePaths),
    ]);

    return {
      locale,
      integrities,
      labelsCount,
    };
  };
}

export function registerLocalizationUsageCollector(
  usageCollection: UsageCollectionSetup,
  i18n: I18nServiceSetup
) {
  const collector = usageCollection.makeUsageCollector<UsageStats>({
    type: 'localization',
    isReady: () => true,
    fetch: createCollectorFetch(i18n),
    schema: {
      locale: {
        type: 'keyword',
        _meta: {
          description: 'The default locale set on the Kibana system',
        },
      },
      integrities: {
        DYNAMIC_KEY: {
          type: 'text',
          _meta: {
            description:
              'Translation file hash. If the hash is different it indicates that a custom translation file is used',
          },
        },
      },
      labelsCount: {
        type: 'long',
        _meta: {
          description: 'The number of translated labels',
        },
      },
    },
  });

  usageCollection.registerCollector(collector);
}
