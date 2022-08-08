/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MaybePromise } from '@kbn/utility-types';

/**
 * Base interface that all core service should implement
 *
 * @internal
 */
export interface CoreService<TSetup = void, TStart = void> {
  setup(...params: any[]): MaybePromise<TSetup>;
  start(...params: any[]): MaybePromise<TStart>;
  stop(): MaybePromise<void>;
}
