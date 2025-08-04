/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as synth from '../synth';
import type { ESQLOrderExpression } from '../types';
import type { ComposerQuery } from './composer_query';
import type { ParameterHole } from './parameter_hole';

export type ComposerQueryTagHole = synth.SynthTemplateHole | ParameterHole | ParameterShorthandHole;

export type ParameterShorthandHole = Record<string, unknown>;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
export type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;
export type SingleKey<T> = IsUnion<keyof T> extends true ? never : {} extends T ? never : T;

export type ComposerTag<Return> = <T extends ComposerQueryTagHole[]>(
  template: TemplateStringsArray,
  /**
   * The SingleKey below ensures that the parameter shorthand holes
   * are processed correctly, allowing only one key per object.
   */
  ...holes: { [K in keyof T]: T[K] extends ParameterShorthandHole ? SingleKey<T[K]> : T[K] }
) => Return;
export type ComposerQueryTag = ComposerTag<ComposerQuery>;
export type ComposerQueryGenerator = (query: string) => ComposerQuery;

type SynthMethods = typeof import('../synth');

export interface ComposerQueryTagMethods extends Omit<SynthMethods, 'par'> {
  par: (value: unknown, name?: string) => ParameterHole;
}

export interface EsqlRequest {
  query: string;
  params?: EsqlRequestParams;
  filter?: unknown;
  columnar?: boolean;
  locale?: string;
  wait_for_completion_timeout?: string;
}

export type EsqlRequestParams = EsqlRequestParamEntry[];
export type EsqlRequestParamEntry = EsqlRequestParamPositionalEntry | EsqlRequestParamNamedEntry;
export type EsqlRequestParamPositionalEntry = string | number | boolean | null;
export type EsqlRequestParamNamedEntry = Record<string, unknown>;

export type ComposerSortShorthand =
  | string
  | [
      column: string | synth.SynthColumnShorthand,
      order?: ESQLOrderExpression['order'],
      nulls?: ESQLOrderExpression['nulls']
    ];
