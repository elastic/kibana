/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface AllowedValue {
  description?: string;
  name?: string;
}

export interface MultiField {
  flat_name: string;
  name: string;
  type: string;
}

export interface EcsMetadata {
  allowed_values?: AllowedValue[];
  dashed_name: string;
  description: string;
  doc_values?: boolean;
  example?: string | number | boolean;
  flat_name: string;
  ignore_above?: number;
  index?: boolean;
  level: string;
  multi_fields?: MultiField[];
  name: string;
  normalize: string[];
  required?: boolean;
  scaling_factor?: number;
  short: string;
  type: string;
  properties?: Record<string, { type: string }>;
}

export type FieldMap<T extends string = string> = Record<
  T,
  {
    type: string;
    required: boolean;
    array?: boolean;
    doc_values?: boolean;
    enabled?: boolean;
    format?: string;
    ignore_above?: number;
    multi_fields?: MultiField[];
    index?: boolean;
    path?: string;
    scaling_factor?: number;
    dynamic?: boolean | 'strict';
    properties?: Record<string, { type: string }>;
    inference_id?: string;
    copy_to?: string;
  }
>;

// This utility type flattens all the keys of a schema object and its nested objects as a union type.
// Its purpose is to ensure that the FieldMap keys are always in sync with the schema object.
// It assumes all optional fields of the schema are required in the field map, they can always be omitted from the resulting type.
export type SchemaFieldMapKeys<
  T extends Record<string, unknown>,
  Key = keyof T
> = Key extends string
  ? NonNullable<T[Key]> extends Record<string, unknown>
    ? `${Key}` | `${Key}.${SchemaFieldMapKeys<NonNullable<T[Key]>>}`
    : `${Key}`
  : never;
