/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ISearchSource } from '@kbn/data-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { getSortForSearchSource } from '../../utils/sorting';

export const updateSearchSource = (
  searchSource: ISearchSource,
  dataView: DataView | undefined,
  sort: (SortOrder[] & string[][]) | undefined,
  sampleSize: number | undefined,
  useNewFieldsApi: boolean,
  defaults: {
    defaultSampleSize: number;
    defaultSort: string;
  }
) => {
  const { defaultSampleSize, defaultSort } = defaults;
  searchSource.setField('size', sampleSize || defaultSampleSize);
  searchSource.setField('sort', getSortForSearchSource(sort, dataView, defaultSort));
  if (useNewFieldsApi) {
    searchSource.removeField('fieldsFromSource');
    const fields: Record<string, string> = { field: '*', include_unmapped: 'true' };
    searchSource.setField('fields', [fields]);
  } else {
    searchSource.removeField('fields');
  }
};
