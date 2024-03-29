/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

/**
 * The list of field names that are allowed for sorting, but not included in
 * data view fields.
 */
const META_FIELD_NAMES: string[] = ['_seq_no', '_doc', '_uid'];

/**
 * Returns a field from the intersection of the set of sortable fields in the
 * given data view and a given set of candidate field names.
 */
export function getFirstSortableField(dataView: DataView, fieldNames: string[]) {
  const sortableFields = fieldNames.filter(
    (fieldName) =>
      META_FIELD_NAMES.includes(fieldName) ||
      (dataView.fields.getByName(fieldName) || { sortable: false }).sortable
  );
  return sortableFields[0];
}

/**
 * Return the reversed sort direction.
 */
export function reverseSortDir(sortDirection: SortDirection) {
  return sortDirection === SortDirection.asc ? SortDirection.desc : SortDirection.asc;
}
