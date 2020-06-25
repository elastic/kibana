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
import { getIntegrityHashes, Integrities } from './file_integrity';
import { KIBANA_LOCALIZATION_STATS_TYPE } from '../constants';

export interface UsageStats {
  locale: string;
  integrities: Integrities;
  labelsCount?: number;
}

export interface LocalizationUsageCollectorHelpers {
  getLocale: () => string;
  getTranslationsFilePaths: () => string[];
}

export async function getTranslationCount(
  loader: typeof i18nLoader,
  locale: string
): Promise<number> {
  const translations = await loader.getTranslationsByLocale(locale);
  return size(translations.messages);
}

export function createCollectorFetch({
  getLocale,
  getTranslationsFilePaths,
}: LocalizationUsageCollectorHelpers) {
  return async function fetchUsageStats(): Promise<UsageStats> {
    const locale = getLocale();
    const translationFilePaths: string[] = getTranslationsFilePaths();

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
  helpers: LocalizationUsageCollectorHelpers
) {
  const collector = usageCollection.makeUsageCollector({
    type: KIBANA_LOCALIZATION_STATS_TYPE,
    isReady: () => true,
    fetch: createCollectorFetch(helpers),
  });

  usageCollection.registerCollector(collector);
}
