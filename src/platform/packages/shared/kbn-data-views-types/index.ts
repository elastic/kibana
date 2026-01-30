/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Constants
export {
  RUNTIME_FIELD_TYPES,
  META_FIELDS,
  DATA_VIEW_SAVED_OBJECT_TYPE,
  MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH,
} from './src/constants';

// Runtime field types
export type {
  RuntimeType,
  RuntimePrimitiveTypes,
  RuntimeFieldBase,
  RuntimeFieldSpec,
  RuntimeField,
  RuntimeFieldSubField,
  RuntimeFieldSubFields,
  FieldConfiguration,
} from './src/runtime_field';

// Field spec types
export type {
  FieldFormatMap,
  FieldAttrs,
  FieldAttrSet,
  FieldAttrsAsObject,
  FieldSpecConflictDescriptions,
  FieldSpec,
  DataViewFieldMap,
} from './src/field_spec';

// Data view spec types
export type {
  AggregationRestrictions,
  TypeMeta,
  SourceFilter,
  DataViewAttributes,
  DataViewSpec,
} from './src/data_view_spec';

export { DataViewType } from './src/data_view_spec';
