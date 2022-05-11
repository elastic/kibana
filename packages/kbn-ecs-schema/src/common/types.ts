/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type EcsNestedSchema = Record<string, GroupDetails>;
export type GroupSchema = Record<string, FieldDetails>;

export const TOP_LEVEL_NAME = 'topLevel';
export const TOP_LEVEL_GROUPS = ['base', 'tracing'];

export type GroupDetails = {
  fields: Record<string, FieldDetails>;
};

export interface FieldDetails {
  dashed_name: string;
  description: string;
  example: string | number | boolean;
  flat_name: string;
  ignore_above?: number;
  level: 'core' | 'extended';
  name: string;
  normalize: string[];
  required?: boolean;
  short: string;
  type: string;
}
