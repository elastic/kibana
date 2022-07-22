/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { Series } from '../../../../common/types';
import { getFieldType } from '../datasource';

export const isSplitWithDateHistogram = async (
  series: Series,
  splitFields: string[],
  indexPatternId: string,
  dataViews: DataViewsPublicPluginStart
) => {
  let splitWithDateHistogram = false;
  if (series.terms_field && series.split_mode === 'terms' && splitFields) {
    for (const f of splitFields) {
      const fieldType = await getFieldType(indexPatternId, f, dataViews);

      if (fieldType === 'date') {
        if (splitFields.length === 1) {
          splitWithDateHistogram = true;
        } else {
          return null;
        }
      }
    }
  }
  return splitWithDateHistogram;
};
