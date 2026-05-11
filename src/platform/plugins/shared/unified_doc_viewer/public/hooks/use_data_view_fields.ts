/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useMemo } from 'react';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import { type DataSource, EsqlSource, IndexPatternSource } from '@kbn/data-source';

interface UseFieldTypesProps {
  fields: string[];
  dataSource?: DataSource;
}

export const useDataViewFields = ({
  fields,
  dataSource,
}: UseFieldTypesProps): { dataViewFields: Record<string, DataViewField | undefined> } => {
  const dataViewFields = useMemo(
    () =>
      fields.reduce((acc, fieldName) => {
        acc[fieldName] = resolveField(dataSource, fieldName);
        return acc;
      }, {} as Record<string, DataViewField | undefined>),
    [fields, dataSource]
  );

  return { dataViewFields };
};

function resolveField(dataSource: DataSource | undefined, fieldName: string) {
  if (!dataSource) return undefined;
  if (dataSource instanceof IndexPatternSource) {
    return dataSource.getDataView().fields.getByName(fieldName);
  }
  if (dataSource instanceof EsqlSource) {
    const column = dataSource.resultColumns.find((c) => c.name === fieldName);
    return column ? new DataViewField(convertDatatableColumnToDataViewFieldSpec(column)) : undefined;
  }
  return undefined;
}
