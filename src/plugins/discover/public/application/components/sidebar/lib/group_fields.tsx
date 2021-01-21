/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IndexPatternField } from 'src/plugins/data/public';
import { FieldFilterState, isFieldFiltered } from './field_filter';

interface GroupedFields {
  selected: IndexPatternField[];
  popular: IndexPatternField[];
  unpopular: IndexPatternField[];
}

/**
 * group the fields into selected, popular and unpopular, filter by fieldFilterState
 */
export function groupFields(
  fields: IndexPatternField[] | null,
  columns: string[],
  popularLimit: number,
  fieldCounts: Record<string, number>,
  fieldFilterState: FieldFilterState,
  useNewFieldsApi: boolean
): GroupedFields {
  const result: GroupedFields = {
    selected: [],
    popular: [],
    unpopular: [],
  };
  if (!Array.isArray(fields) || !Array.isArray(columns) || typeof fieldCounts !== 'object') {
    return result;
  }

  const popular = fields
    .filter((field) => !columns.includes(field.name) && field.count)
    .sort((a: IndexPatternField, b: IndexPatternField) => (b.count || 0) - (a.count || 0))
    .map((field) => field.name)
    .slice(0, popularLimit);

  const compareFn = (a: IndexPatternField, b: IndexPatternField) => {
    if (!a.displayName) {
      return 0;
    }
    return a.displayName.localeCompare(b.displayName || '');
  };
  const fieldsSorted = fields.sort(compareFn);

  for (const field of fieldsSorted) {
    if (!isFieldFiltered(field, fieldFilterState, fieldCounts)) {
      continue;
    }
    const isSubfield = useNewFieldsApi && field.spec?.subType?.multi?.parent;
    if (columns.includes(field.name)) {
      result.selected.push(field);
    } else if (popular.includes(field.name) && field.type !== '_source') {
      if (!isSubfield) {
        result.popular.push(field);
      }
    } else if (field.type !== '_source') {
      if (!isSubfield) {
        result.unpopular.push(field);
      }
    }
  }
  // add columns, that are not part of the index pattern, to be removeable
  for (const column of columns) {
    if (!result.selected.find((field) => field.name === column)) {
      result.selected.push({ name: column, displayName: column } as IndexPatternField);
    }
  }
  result.selected.sort((a, b) => {
    return columns.indexOf(a.name) - columns.indexOf(b.name);
  });

  return result;
}
