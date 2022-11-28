/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniqBy } from 'lodash';
import {
  type DataViewField,
  type DataView,
  getFieldSubtypeMulti,
} from '@kbn/data-views-plugin/public';

export function shouldShowField(field: DataViewField | undefined, isPlainRecord: boolean): boolean {
  if (!field?.type || field.type === '_source') {
    return false;
  }
  if (isPlainRecord) {
    // exclude only `_source` for plain records
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

export function getSelectedFields(
  dataView: DataView | undefined,
  columns: string[]
): SelectedFieldsResult {
  const result: SelectedFieldsResult = {
    selectedFields: [],
    selectedFieldsMap: {},
  };
  if (!Array.isArray(columns) || !columns.length) {
    return INITIAL_SELECTED_FIELDS_RESULT;
  }

  // add selected columns, that are not part of the data view, to be removable
  for (const column of columns) {
    const selectedField =
      dataView?.getFieldByName?.(column) ||
      ({
        name: column,
        displayName: column,
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
