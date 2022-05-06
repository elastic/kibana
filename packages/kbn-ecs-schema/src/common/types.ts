/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Represents the top-level structure of the ecs_nested.yml.
 */
export type EcsNestedSchema = Record<string, GroupDetails>;
export type GroupSchema = Record<string, FieldDetails>;

export const TOP_LEVEL_NAME = 'topLevel';
export const TOP_LEVEL_GROUPS = ['base', 'tracing'];

/**
 * Metadata for each of the top-level items in the EcsSpec.
 */
export type GroupDetails = {
  description: string;
  fields: Record<string, FieldDetails>;
  footnote?: string;
  group: number;
  prefix: string;
  root?: boolean;
  short: string;
  title: string;
  type: string;
};

/**
 * Metadata for each field in a EcsGroupSpec.
 */
export interface FieldDetails {
  dashed_name: string;
  description: string;
  example: string;
  flat_name: string;
  ignore_above: number;
  level: 'core' | 'extended';
  name: string;
  normalize: string[];
  required?: boolean;
  short: string;
  type: string;
}
