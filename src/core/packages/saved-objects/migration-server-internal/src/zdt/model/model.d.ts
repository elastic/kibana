/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { State, AllActionStates } from '../state';
import type { ResponseType } from '../next';
import type { MigratorContext } from '../context';
import type { ModelStage } from './types';
type ModelStageMap = {
  [K in AllActionStates]: ModelStage<K, any>;
};
export declare const modelStageMap: ModelStageMap;
export declare const model: (
  current: State,
  response: ResponseType<AllActionStates>,
  context: MigratorContext
) => State;
export {};
