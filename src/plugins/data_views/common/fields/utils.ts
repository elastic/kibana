/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFilterableKbnTypeNames } from '@kbn/field-types';
import { DataViewFieldBase, IFieldSubTypeNested, IFieldSubTypeMulti } from '@kbn/es-query';
import type { DataViewField } from '.';

const filterableTypes = getFilterableKbnTypeNames();

export function isFilterable(field: DataViewField): boolean {
  return (
    field.name === '_id' ||
    field.scripted ||
    Boolean(field.searchable && filterableTypes.includes(field.type))
  );
}

export const isNestedField = isDataViewFieldSubtypeNested;
export const isMultiField = isDataViewFieldSubtypeMulti;
export const getFieldSubtypeMulti = getDataViewFieldSubtypeMulti;
export const getFieldSubtypeNested = getDataViewFieldSubtypeNested;

const DOT_PREFIX_RE = /(.).+?\./g;

/**
 * Convert a dot.notated.string into a short
 * version (d.n.string)
 */
export function shortenDottedString(input: string): string {
  return typeof input !== 'string' ? input : input.replace(DOT_PREFIX_RE, '$1.');
}

// Note - this code is duplicated from @kbn/es-query
// as importing code adds about 30k to the data_view bundle size
type HasSubtype = Pick<DataViewFieldBase, 'subType'>;

export function isDataViewFieldSubtypeNested(field: HasSubtype) {
  const subTypeNested = field?.subType as IFieldSubTypeNested;
  return !!subTypeNested?.nested?.path;
}

export function getDataViewFieldSubtypeNested(field: HasSubtype) {
  return isDataViewFieldSubtypeNested(field) ? (field.subType as IFieldSubTypeNested) : undefined;
}

export function isDataViewFieldSubtypeMulti(field: HasSubtype) {
  const subTypeNested = field?.subType as IFieldSubTypeMulti;
  return !!subTypeNested?.multi?.parent;
}

/**
 * Returns subtype data for multi field
 * @public
 * @param field field to get subtype data from
 */

export function getDataViewFieldSubtypeMulti(field: HasSubtype) {
  return isDataViewFieldSubtypeMulti(field) ? (field.subType as IFieldSubTypeMulti) : undefined;
}
