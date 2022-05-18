/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { getCoreStart, getDataViewsStart } from '../../services';
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
  const defaultIndex = coreStart.uiSettings.get('defaultIndex');

  try {
    const indexFields = await Promise.all(
      patterns.map(async (pattern) => {
        if (typeof pattern !== 'string' && pattern?.id) {
          return toSanitizedFieldType(
            (await getDataViewsStart().get(pattern.id)).getNonScriptedFields()
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

    const fields: VisFields = patterns.reduce((cumulatedFields, currentPattern, index) => {
      const key = getIndexPatternKey(currentPattern);
      return {
        ...cumulatedFields,
        [key]: indexFields[index],
        ...(key === defaultIndex ? { '': indexFields[index] } : {}),
      };
    }, {});

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
