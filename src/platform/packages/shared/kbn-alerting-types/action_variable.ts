/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ActionVariable {
  name: string;
  description: string;
  deprecated?: boolean;
  useWithTripleBracesInTemplates?: boolean;
  usesPublicBaseUrl?: boolean;
}

/**
 *  Returns all flattened keys from a deeply nested object as union
 */
type FlattenKeys<T extends Record<string, unknown>, Key = keyof T> = Key extends string
  ? T[Key] extends Record<string, unknown>
    ? `${Key}.${FlattenKeys<T[Key]>}`
    : `${Key}`
  : never;

/**
 * All valid action context variables
 */
export interface ActionContextVariables {
  tags?: string[];
  spaceId: string;
  date: string;
  rule?: {
    id: string;
    familyId: string;
  };
  status?: string;
}

/**
 * All valid summarized action context variables
 */
export type SummaryActionContextVariables = ActionContextVariables & {
  alerts: {
    new: {
      count: number;
      data: unknown[];
    };
    recovered: {
      count: number;
      data: unknown[];
    };
  };
};

/**
 * This type takes a deep nested object and returns all flattened keys as a union.
 * This is needed for the UI where the context variables are used as flattened keys.
 * We need to remove params and add it ourselves because FlattenKeys
 * produces `params.${string}` for the params which leads to a TS error
 * in the UI when the key of the record is `params`
 */
export type ActionContextVariablesFlatten =
  | FlattenKeys<Omit<ActionContextVariables, 'context' | 'state' | 'params'>>
  | 'params'
  | 'rule.params';

export type SummaryActionContextVariablesFlatten =
  | FlattenKeys<Omit<SummaryActionContextVariables, 'context' | 'state' | 'params'>>
  | 'params'
  | 'rule.params';
