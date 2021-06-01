/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { getCoreStart, getDataStart } from '../../services';
import { ROUTES } from '../../../common/constants';
import type { SanitizedFieldType, IndexPatternValue } from '../../../common/types';
import { getIndexPatternKey } from '../../../common/index_patterns_utils';
import { toSanitizedFieldType } from '../../../common/fields_utils';

export type VisFields = Record<string, SanitizedFieldType[]>;

export async function fetchFields(
  indexes: IndexPatternValue[] = [],
  signal?: AbortSignal
): Promise<VisFields> {
  const patterns = Array.isArray(indexes) ? indexes : [indexes];
  const coreStart = getCoreStart();
  const dataStart = getDataStart();

  try {
    const defaultIndexPattern = await dataStart.indexPatterns.getDefault();
    const indexFields = await Promise.all(
      patterns.map(async (pattern) => {
        if (typeof pattern !== 'string' && pattern?.id) {
          return toSanitizedFieldType(
            (await dataStart.indexPatterns.get(pattern.id)).getNonScriptedFields()
          );
        } else {
          return coreStart.http.get(ROUTES.FIELDS, {
            query: {
              index: `${pattern ?? ''}`,
            },
            signal,
          });
        }
      })
    );

    const fields: VisFields = patterns.reduce(
      (cumulatedFields, currentPattern, index) => ({
        ...cumulatedFields,
        [getIndexPatternKey(currentPattern)]: indexFields[index],
      }),
      {}
    );

    if (defaultIndexPattern) {
      fields[''] = toSanitizedFieldType(await defaultIndexPattern.getNonScriptedFields());
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
