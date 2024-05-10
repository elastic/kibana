/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

export interface FieldMap {
  [key: string]: {
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
  };
}
