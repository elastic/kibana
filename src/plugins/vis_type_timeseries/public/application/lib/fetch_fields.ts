/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
