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
import { getIntegrityHashes, Integrities } from './file_integrity';
import { KIBANA_LOCALIZATION_STATS_TYPE } from '../../../common/constants';
import { UsageCollectionSetup } from '../../../../../../plugins/usage_collection/server';
export interface UsageStats {
  locale: string;
  integrities: Integrities;
  labelsCount?: number;
}

export async function getTranslationCount(loader: any, locale: string): Promise<number> {
  const translations = await loader.getTranslationsByLocale(locale);
  return size(translations.messages);
}

export function createCollectorFetch(server: any) {
  return async function fetchUsageStats(): Promise<UsageStats> {
    const config = server.config();
    const locale: string = config.get('i18n.locale');
    const translationFilePaths: string[] = server.getTranslationsFilePaths();

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
  server: any
) {
  const collector = usageCollection.makeUsageCollector({
    type: KIBANA_LOCALIZATION_STATS_TYPE,
    isReady: () => true,
    fetch: createCollectorFetch(server),
  });

  usageCollection.registerCollector(collector);
}
