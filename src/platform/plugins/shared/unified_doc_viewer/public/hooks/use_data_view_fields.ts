/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useMemo } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta } from '@kbn/discover-utils/types';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';

interface UseFieldTypesProps {
  fields: string[];
  dataView: DataView;
  columnsMeta?: DataTableColumnsMeta;
}

export const useDataViewFields = ({
  fields,
  dataView,
  columnsMeta,
}: UseFieldTypesProps): { dataViewFields: Record<string, DataViewField | undefined> } => {
  const dataViewFields = useMemo(
    () =>
      fields.reduce((acc, fieldName) => {
        acc[fieldName] = getDataViewFieldOrCreateFromColumnMeta({
          fieldName,
          dataView,
          columnMeta: columnsMeta?.[fieldName],
        });

        return acc;
      }, {} as Record<string, DataViewField | undefined>),
    [fields, dataView, columnsMeta]
  );

  return { dataViewFields };
};
