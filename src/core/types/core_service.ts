/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/** @internal */
export interface CoreService<TSetup = void, TStart = void> {
  setup(...params: any[]): TSetup | Promise<TSetup>;
  start(...params: any[]): TStart | Promise<TStart>;
  stop(): void | Promise<void>;
}
