/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove the eslint-disable comments to use the proper types.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface StepContext<T extends Record<string, any> = Record<string, any>> {
  output: T;
}

export interface CurrentStepContext<
  T extends Record<string, any> = Record<string, any>,
  S extends Record<string, any> = Record<string, any>
> {
  foreach?: {
    item: T;
  };
  consts: Record<string, string | number | boolean | any[] | Record<string, any> | {}>;
  steps: Record<string, StepContext<S>>;
}
