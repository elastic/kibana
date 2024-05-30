/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

type RemoveGenericString<K extends string> = K extends `${infer Prefix}.${string}`
  ? RemoveGenericString<Prefix>
  : K;

export type Test = RemoveGenericString<
  FlattenKeys<Omit<ActionContextVariables, 'context' | 'state'>>
>;

export interface ActionContextVariables {
  alertId: string;
  alertName: string;
  alertInstanceId: string;
  alertActionGroup: string;
  alertActionGroupName: string;
  tags?: string[];
  spaceId: string;
  params: Record<string, unknown>;
  context: Record<string, unknown>;
  date: string;
  state: Record<string, unknown>;
  kibanaBaseUrl?: string;
  rule: {
    id: string;
    name: string;
    spaceId: string;
    type: string;
    params: Record<string, unknown>;
    tags?: string[];
    url?: string;
  };
  alert: {
    id: string;
    uuid: string;
    actionGroup: string;
    actionGroupName: string;
    flapping: boolean;
    consecutiveMatches?: number;
  };
}

export type SummaryActionContextVariables = ActionContextVariables & {
  alerts: {
    new: {
      count: number;
      data: unknown[];
    };
    ongoing: {
      count: number;
      data: unknown[];
    };
    recovered: {
      count: number;
      data: unknown[];
    };
    all: {
      count: number;
      data: unknown[];
    };
  };
};

export type ActionContextVariablesFlatten =
  | FlattenKeys<Omit<ActionContextVariables, 'context' | 'state' | 'params'>>
  | 'params'
  | 'rule.params';

export type SummaryActionContextVariablesFlatten =
  | FlattenKeys<Omit<SummaryActionContextVariables, 'context' | 'state' | 'params'>>
  | 'params'
  | 'rule.params';
