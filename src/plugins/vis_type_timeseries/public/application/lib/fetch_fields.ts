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
import { i18n } from '@kbn/i18n';
import { getCoreStart, getDataStart } from '../../services';
import { ROUTES } from '../../../common/constants';
import { SanitizedFieldType } from '../../../common/types';

export async function fetchFields(
  indexes: string[] = [],
  signal?: AbortSignal
): Promise<Record<string, SanitizedFieldType[]>> {
  const patterns = Array.isArray(indexes) ? indexes : [indexes];
  const coreStart = getCoreStart();
  const dataStart = getDataStart();

  try {
    const defaultIndexPattern = await dataStart.indexPatterns.getDefault();
    const indexFields = await Promise.all(
      patterns.map(async (pattern) => {
        return coreStart.http.get(ROUTES.FIELDS, {
          query: {
            index: pattern,
          },
          signal,
        });
      })
    );

    const fields: Record<string, SanitizedFieldType[]> = patterns.reduce(
      (cumulatedFields, currentPattern, index) => ({
        ...cumulatedFields,
        [currentPattern]: indexFields[index],
      }),
      {}
    );

    if (defaultIndexPattern?.title && patterns.includes(defaultIndexPattern.title)) {
      fields[''] = fields[defaultIndexPattern.title];
    }
    return fields;
  } catch (error) {
    if (error.name !== 'AbortError') {
      getCoreStart().notifications.toasts.addDanger({
        title: i18n.translate('visTypeTimeseries.fetchFields.loadIndexPatternFieldsErrorMessage', {
          defaultMessage: 'Unable to load index_pattern fields',
        }),
        text: error.message,
      });
    }
  }
  return {};
}
