/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

export type MaybeOutputOf<T> = T extends t.Type<any> ? [t.OutputOf<T>] : [];
export type NormalizePath<T extends string> = T extends `//${infer TRest}`
  ? NormalizePath<`/${TRest}`>
  : T extends '/'
  ? T
  : T extends `${infer TRest}/`
  ? TRest
  : T;
export type DeeplyMutableRoutes<T> = T extends React.ReactElement
  ? T
  : T extends t.Type<any>
  ? T
  : T extends readonly [infer U]
  ? [DeeplyMutableRoutes<U>]
  : T extends readonly [infer U, ...infer V]
  ? [DeeplyMutableRoutes<U>, ...DeeplyMutableRoutes<V>]
  : T extends Record<any, any>
  ? {
      -readonly [key in keyof T]: DeeplyMutableRoutes<T[key]>;
    }
  : T;
