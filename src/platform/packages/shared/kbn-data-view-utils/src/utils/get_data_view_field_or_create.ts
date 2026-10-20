/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from './convert_to_data_view_field_spec';

/** The data view field of an ES|QL column, created from the column when the data view has a different type. */
export const getDataViewFieldOrCreateFromColumn = ({
  dataView,
  fieldName,
  column,
}: {
  dataView: DataView;
  fieldName: string;
  column?: { type: string; esType?: string; source?: 'index' | 'esql-result' };
}) => {
  const dataViewField = dataView.fields.getByName(fieldName);

  if (!column) {
    return dataViewField;
  }

  const fieldSpecFromColumn = convertDatatableColumnToDataViewFieldSpec({
    name: fieldName,
    id: fieldName,
    meta: { type: column.type as DatatableColumnMeta['type'], esType: column.esType },
    isComputedColumn: column.source === 'esql-result',
  });

  if (
    !dataViewField ||
    dataViewField.type !== fieldSpecFromColumn.type ||
    !isEqual(dataViewField.esTypes, fieldSpecFromColumn.esTypes)
  ) {
    return dataView.fields.create(fieldSpecFromColumn);
  }

  return dataViewField;
};
