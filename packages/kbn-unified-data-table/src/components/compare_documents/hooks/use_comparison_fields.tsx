/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { isEqual } from 'lodash';
import { useMemo } from 'react';

export interface UseComparisonFieldsProps {
  dataView: DataView;
  selectedFieldNames: string[];
  selectedDocs: string[];
  showAllFields: boolean;
  showMatchingValues: boolean;
  getDocById: (id: string) => DataTableRecord | undefined;
}

export const useComparisonFields = ({
  dataView,
  selectedFieldNames,
  selectedDocs,
  showAllFields,
  showMatchingValues,
  getDocById,
}: UseComparisonFieldsProps) => {
  const { baseDoc, comparisonDocs } = useMemo(() => {
    const [baseDocId, ...comparisonDocIds] = selectedDocs;

    return {
      baseDoc: getDocById(baseDocId),
      comparisonDocs: comparisonDocIds
        .map((docId) => getDocById(docId))
        .filter((doc): doc is DataTableRecord => Boolean(doc)),
    };
  }, [getDocById, selectedDocs]);

  const comparisonFields = useMemo(() => {
    let fieldNames = selectedFieldNames;

    if (showAllFields) {
      const sortedFieldNames = dataView.fields
        .filter((field) => field.name !== dataView.timeFieldName)
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((field) => field.name);

      fieldNames = dataView.isTimeBased()
        ? [dataView.timeFieldName, ...sortedFieldNames]
        : sortedFieldNames;
    }

    if (!baseDoc || showMatchingValues) {
      return fieldNames;
    }

    return fieldNames.filter((fieldName) =>
      comparisonDocs.some((doc) => !isEqual(doc.flattened[fieldName], baseDoc.flattened[fieldName]))
    );
  }, [baseDoc, comparisonDocs, dataView, selectedFieldNames, showAllFields, showMatchingValues]);

  return comparisonFields;
};
