/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldSpec, RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isEsqlFilterableSource } from '@kbn/data-source';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type { DataControlFieldFormatter } from '../types';

// A `DataView` has more than a `FilterableSource` needs to have: these are the capabilities that
// controls read when they are there.
interface WithFormatter {
  getFormatterForField: (field: FieldSpec) => { convertToText: (value: unknown) => string };
}
interface WithFieldLookup {
  getFieldByName: (fieldName: string) => FilterableField | undefined;
}
interface WithSpec {
  toSpec: (includeFields?: boolean) => { runtimeFieldMap?: Record<string, RuntimeFieldSpec> };
}

export const getFieldByName = (
  source: FilterableSource | undefined,
  fieldName: string
): FilterableField | undefined => {
  if (!source) return undefined;
  // A `DataView` looks a field up by name in a map, a list is read in full.
  return 'getFieldByName' in source
    ? (source as unknown as WithFieldLookup).getFieldByName(fieldName)
    : source.fields.find(({ name }) => name === fieldName);
};

export const getFieldDisplayName = ({ displayName, name }: FilterableField) => displayName ?? name;

export const getFieldSpec = (field: FilterableField) => (field.toSpec?.() ?? field) as FieldSpec;

export const getRuntimeFieldMap = (source: FilterableSource) =>
  'toSpec' in source ? (source as unknown as WithSpec).toSpec(false).runtimeFieldMap : undefined;

export const getFieldFormatter = (
  source: FilterableSource,
  field: FilterableField
): DataControlFieldFormatter | undefined => {
  if (!('getFormatterForField' in source)) return undefined;
  const formatter = (source as unknown as WithFormatter).getFormatterForField(getFieldSpec(field));
  return (value: unknown) => formatter.convertToText(value);
};

/**
 * A search source can only use a `DataView` as its index. A source is a `DataView` unless it is the
 * source of an ES|QL dataset, see `FilterableSource.kind`.
 */
export const asDataView = (source: FilterableSource | undefined): DataView | undefined =>
  source && !isEsqlFilterableSource(source) ? (source as DataView) : undefined;
