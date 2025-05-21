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

export const getDataViewFieldOrCreateFromColumnMeta = ({
  dataView,
  fieldName,
  columnMeta,
}: {
  dataView: DataView;
  fieldName: string;
  columnMeta?: DatatableColumnMeta; // based on ES|QL query
}) => {
  const dataViewField = dataView.fields.getByName(fieldName);

  if (!columnMeta) {
    return dataViewField;
  }

  const fieldSpecFromColumnMeta = convertDatatableColumnToDataViewFieldSpec({
    name: fieldName,
    id: fieldName,
    meta: columnMeta,
  });

  if (
    !dataViewField ||
    dataViewField.type !== fieldSpecFromColumnMeta.type ||
    !isEqual(dataViewField.esTypes, fieldSpecFromColumnMeta.esTypes)
  ) {
    return dataView.fields.create(fieldSpecFromColumnMeta);
  }

  return dataViewField;
};
