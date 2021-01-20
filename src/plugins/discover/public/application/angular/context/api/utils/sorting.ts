/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IndexPattern } from '../../../../../kibana_services';

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

/**
 * The list of field names that are allowed for sorting, but not included in
 * index pattern fields.
 */
const META_FIELD_NAMES: string[] = ['_seq_no', '_doc', '_uid'];

/**
 * Returns a field from the intersection of the set of sortable fields in the
 * given index pattern and a given set of candidate field names.
 */
export function getFirstSortableField(indexPattern: IndexPattern, fieldNames: string[]) {
  const sortableFields = fieldNames.filter(
    (fieldName) =>
      META_FIELD_NAMES.includes(fieldName) ||
      // @ts-ignore
      (indexPattern.fields.getByName(fieldName) || { sortable: false }).sortable
  );
  return sortableFields[0];
}

/**
 * Return the reversed sort direction.
 */
export function reverseSortDir(sortDirection: SortDirection) {
  return sortDirection === SortDirection.asc ? SortDirection.desc : SortDirection.asc;
}
