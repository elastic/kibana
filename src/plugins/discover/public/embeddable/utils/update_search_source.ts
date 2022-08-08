/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import { ISearchSource } from '@kbn/data-plugin/public';
import { getSortForSearchSource } from '../../components/doc_table';
import { SortPairArr } from '../../components/doc_table/utils/get_sort';

export const updateSearchSource = (
  searchSource: ISearchSource,
  dataView: DataView | undefined,
  sort: (SortPairArr[] & string[][]) | undefined,
  useNewFieldsApi: boolean,
  defaults: {
    sampleSize: number;
    defaultSort: string;
  }
) => {
  const { sampleSize, defaultSort } = defaults;
  searchSource.setField('size', sampleSize);
  searchSource.setField('sort', getSortForSearchSource(sort, dataView, defaultSort));
  if (useNewFieldsApi) {
    searchSource.removeField('fieldsFromSource');
    const fields: Record<string, string> = { field: '*', include_unmapped: 'true' };
    searchSource.setField('fields', [fields]);
  } else {
    searchSource.removeField('fields');
  }
};
