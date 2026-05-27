/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils/types';
import { isEqual } from 'lodash';
import { useMemo } from 'react';
import type { DocMap } from '../../../types';

export const MAX_COMPARISON_FIELDS = 250;

export interface UseComparisonFieldsProps {
  dataView: DataView;
  columnsMeta: DataTableColumnsMeta | undefined;
  selectedFieldNames: string[];
  selectedDocIds: string[];
  showAllFields: boolean;
  showMatchingValues: boolean;
  docMap: DocMap;
}

export const useComparisonFields = ({
  dataView,
  columnsMeta,
  selectedFieldNames,
  selectedDocIds,
  showAllFields,
  showMatchingValues,
  docMap,
}: UseComparisonFieldsProps) => {
  const { baseDoc, comparisonDocs } = useMemo(() => {
    const [baseDocId, ...comparisonDocIds] = selectedDocIds;

    return {
      baseDoc: docMap.get(baseDocId)?.doc,
      comparisonDocs: comparisonDocIds
        .map((docId) => docMap.get(docId)?.doc)
        .filter((doc): doc is DataTableRecord => Boolean(doc)),
    };
  }, [docMap, selectedDocIds]);

  return useMemo(() => {
    let comparisonFields = selectedFieldNames;

    if (showAllFields) {
      const dataViewFieldNames = dataView.fields.map((field) => field.name);
      const columnsMetaFieldNames = columnsMeta ? Object.keys(columnsMeta) : [];
      const fieldNames =
        columnsMetaFieldNames.length > 0
          ? [...new Set([...dataViewFieldNames, ...columnsMetaFieldNames])]
          : dataViewFieldNames;

      const sortedFields = fieldNames
        .filter((fieldName) => {
          if (fieldName === dataView.timeFieldName) {
            return false;
          }

          return (
            baseDoc?.flattened[fieldName] != null ||
            comparisonDocs.some((doc) => doc.flattened[fieldName] != null)
          );
        })
        .sort((a, b) => a.localeCompare(b));

      comparisonFields = dataView.isTimeBased()
        ? [dataView.timeFieldName, ...sortedFields]
        : sortedFields;
    }

    if (baseDoc && !showMatchingValues) {
      comparisonFields = comparisonFields.filter((fieldName) =>
        comparisonDocs.some(
          (doc) => !isEqual(doc.flattened[fieldName], baseDoc.flattened[fieldName])
        )
      );
    }

    const totalFields = comparisonFields.length;

    if (totalFields > MAX_COMPARISON_FIELDS) {
      comparisonFields = comparisonFields.slice(0, MAX_COMPARISON_FIELDS);
    }

    return { comparisonFields, totalFields };
  }, [
    baseDoc,
    comparisonDocs,
    columnsMeta,
    dataView,
    selectedFieldNames,
    showAllFields,
    showMatchingValues,
  ]);
};
