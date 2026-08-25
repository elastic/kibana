/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataSource, IndexPatternSource } from '@kbn/data-source';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { isEqual } from 'lodash';
import { useMemo } from 'react';
import type { DocMap } from '../../../types';
import { SOURCE_COLUMN } from '../../../utils/columns';

export const MAX_COMPARISON_FIELDS = 250;

export interface UseComparisonFieldsProps {
  dataSource?: DataSource;
  selectedFieldNames: string[];
  selectedDocIds: string[];
  showAllFields: boolean;
  showMatchingValues: boolean;
  docMap: DocMap;
}

/**
 * Field names available for comparison, sorted by display name. DSL sources use the
 * DataView's fields; ES|QL sources use the query's result columns, which carry no
 * display name of their own.
 */
const getSortableFieldNames = (
  dataSource: DataSource
): Array<{ name: string; displayName: string }> => {
  if (dataSource instanceof IndexPatternSource) {
    return dataSource.getDataView().fields.map(({ name, displayName }) => ({ name, displayName }));
  }
  return dataSource.getColumns().map(({ name }) => ({ name, displayName: name }));
};

export const useComparisonFields = ({
  dataSource,
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
    // Summary is not a comparable field; compare selected fields only
    let comparisonFields = selectedFieldNames.filter((fieldName) => fieldName !== SOURCE_COLUMN);

    if (showAllFields && dataSource) {
      const { timeFieldName } = dataSource;
      const sortedFields = getSortableFieldNames(dataSource)
        .filter(({ name }) => {
          if (name === timeFieldName) {
            return false;
          }

          return (
            baseDoc?.flattened[name] != null ||
            comparisonDocs.some((doc) => doc.flattened[name] != null)
          );
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map(({ name }) => name);

      comparisonFields =
        dataSource.isTimeBased() && timeFieldName ? [timeFieldName, ...sortedFields] : sortedFields;
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
  }, [baseDoc, comparisonDocs, dataSource, selectedFieldNames, showAllFields, showMatchingValues]);
};
