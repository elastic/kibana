/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniqBy } from 'lodash';
import {
  type DataViewField,
  type DataView,
  getFieldSubtypeMulti,
} from '@kbn/data-views-plugin/public';
import type { SearchMode } from '../../types';

export function shouldShowField(
  field: DataViewField | undefined,
  searchMode: SearchMode | undefined,
  disableMultiFieldsGroupingByParent: boolean | undefined
): boolean {
  if (!field?.type || field.type === '_source') {
    return false;
  }
  if (searchMode === 'text-based') {
    // exclude only `_source` for plain records
    return true;
  }
  if (disableMultiFieldsGroupingByParent) {
    // include subfields
    return true;
  }
  // exclude subfields
  return !getFieldSubtypeMulti(field?.spec);
}

// to avoid rerenderings for empty state
export const INITIAL_SELECTED_FIELDS_RESULT = {
  selectedFields: [],
  selectedFieldsMap: {},
};

export interface SelectedFieldsResult {
  selectedFields: DataViewField[];
  selectedFieldsMap: Record<string, boolean>;
}

export function getSelectedFields({
  dataView,
  workspaceSelectedFieldNames,
  allFields,
  searchMode,
}: {
  dataView: DataView | undefined;
  workspaceSelectedFieldNames?: string[];
  allFields: DataViewField[] | null;
  searchMode: SearchMode | undefined;
}): SelectedFieldsResult {
  const result: SelectedFieldsResult = {
    selectedFields: [],
    selectedFieldsMap: {},
  };
  if (
    !workspaceSelectedFieldNames ||
    !Array.isArray(workspaceSelectedFieldNames) ||
    !workspaceSelectedFieldNames.length ||
    !allFields
  ) {
    return INITIAL_SELECTED_FIELDS_RESULT;
  }

  // add selected field names, that are not part of the data view, to be removable
  for (const selectedFieldName of workspaceSelectedFieldNames) {
    const selectedField =
      (searchMode === 'documents' && dataView?.getFieldByName?.(selectedFieldName)) ||
      allFields.find((field) => field.name === selectedFieldName) || // for example to pick a `nested` root field or find a selected field in text-based response
      ({
        name: selectedFieldName,
        displayName: selectedFieldName,
        type: 'unknown_selected',
      } as DataViewField);
    result.selectedFields.push(selectedField);
    result.selectedFieldsMap[selectedField.name] = true;
  }

  result.selectedFields = uniqBy(result.selectedFields, 'name');

  if (result.selectedFields.length === 1 && result.selectedFields[0].name === '_source') {
    return INITIAL_SELECTED_FIELDS_RESULT;
  }

  return result;
}
