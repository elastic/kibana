/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { extractIndexPatterns } from '../../../common/extract_index_patterns';
import { getCoreStart } from '../../services';
import { ROUTES } from '../../../common/constants';

export async function fetchFields(indexPatterns = [], signal) {
  const patterns = Array.isArray(indexPatterns) ? indexPatterns : [indexPatterns];
  try {
    const indexFields = await Promise.all(
      patterns.map((pattern) =>
        getCoreStart().http.get(ROUTES.FIELDS, {
          query: {
            index: pattern,
          },
          signal,
        })
      )
    );

    return patterns.reduce(
      (cumulatedFields, currentPattern, index) => ({
        ...cumulatedFields,
        [currentPattern]: indexFields[index],
      }),
      {}
    );
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
  return [];
}

export async function fetchIndexPatternFields({ params, fields = {} }) {
  const indexPatterns = extractIndexPatterns(params, fields);

  return await fetchFields(indexPatterns);
}
