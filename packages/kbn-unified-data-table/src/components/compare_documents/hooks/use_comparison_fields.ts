/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { AdditionalFieldGroups, convertFieldsToFallbackFields } from '@kbn/unified-field-list';
import { isEqual } from 'lodash';
import { useMemo } from 'react';

export const MAX_COMPARISON_FIELDS = 100;

export interface UseComparisonFieldsProps {
  dataView: DataView;
  selectedFieldNames: string[];
  selectedDocs: string[];
  showAllFields: boolean;
  showMatchingValues: boolean;
  getDocById: (id: string) => DataTableRecord | undefined;
  additionalFieldGroups?: AdditionalFieldGroups;
}

export const useComparisonFields = ({
  dataView,
  selectedFieldNames,
  selectedDocs,
  showAllFields,
  showMatchingValues,
  getDocById,
  additionalFieldGroups,
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

  return useMemo(() => {
    let comparisonFields = convertFieldsToFallbackFields({
      fields: selectedFieldNames,
      additionalFieldGroups,
    });

    if (showAllFields) {
      const sortedFields = dataView.fields
        .filter((field) => {
          if (field.name === dataView.timeFieldName) {
            return false;
          }

          return (
            baseDoc?.flattened[field.name] != null ||
            comparisonDocs.some((doc) => doc.flattened[field.name] != null)
          );
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((field) => field.name);

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
    additionalFieldGroups,
    baseDoc,
    comparisonDocs,
    dataView,
    selectedFieldNames,
    showAllFields,
    showMatchingValues,
  ]);
};
