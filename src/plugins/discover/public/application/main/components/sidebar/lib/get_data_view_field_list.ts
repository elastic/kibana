/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { difference } from 'lodash';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { fieldWildcardFilter } from '@kbn/kibana-utils-plugin/public';
import { isNestedFieldParent } from '../../../utils/nested_fields';

export function getDataViewFieldList(
  dataView: DataView | undefined | null,
  fieldCounts: Record<string, number> | undefined | null,
  isPlainRecord: boolean
): DataViewField[] | null {
  if (isPlainRecord && !fieldCounts) {
    // still loading data
    return null;
  }

  console.log('*** getDataViewFieldList', fieldCounts);

  const currentFieldCounts = fieldCounts || {};
  const sourceFiltersValues = dataView?.getSourceFiltering?.()?.excludes;
  let dataViewFields: DataViewField[] = dataView?.fields.getAll() || [];

  if (sourceFiltersValues) {
    const filter = fieldWildcardFilter(sourceFiltersValues, dataView.metaFields);
    dataViewFields = dataViewFields.filter((field) => {
      return filter(field.name) || currentFieldCounts[field.name]; // don't filter out a field which was present in hits (ex. for text-based queries, selected fields)
    });
  }

  const fieldNamesInDocs = Object.keys(currentFieldCounts);
  const fieldNamesInDataView = dataViewFields.map((fld) => fld.name);
  const unknownFields: DataViewField[] = [];

  difference(fieldNamesInDocs, fieldNamesInDataView).forEach((unknownFieldName) => {
    if (dataView && isNestedFieldParent(unknownFieldName, dataView)) {
      unknownFields.push({
        displayName: String(unknownFieldName),
        name: String(unknownFieldName),
        type: 'nested',
      } as DataViewField);
    } else {
      unknownFields.push({
        displayName: String(unknownFieldName),
        name: String(unknownFieldName),
        type: 'unknown',
      } as DataViewField);
    }
  });

  return [
    ...(isPlainRecord
      ? dataViewFields.filter((field) => currentFieldCounts[field.name])
      : dataViewFields),
    ...unknownFields,
  ];
}
