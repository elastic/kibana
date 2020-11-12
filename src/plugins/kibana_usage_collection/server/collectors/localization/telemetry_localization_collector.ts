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

import { i18nLoader } from '@kbn/i18n';
import { size } from 'lodash';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { I18nServiceSetup } from '../../../../../core/server';
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
      locale: { type: 'keyword' },
      integrities: { DYNAMIC_KEY: { type: 'text' } },
      labelsCount: { type: 'long' },
    },
  });

  usageCollection.registerCollector(collector);
}
