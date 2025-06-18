/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import { SavedObjectReference } from '@kbn/core/server';

export type EmbeddableTransforms<StoredState, State> = {
  schema?: Type<State>;
  transformOut?: (
    state: StoredState,
    references?: SavedObjectReference[],
  ) => State;
  transformIn?: (state: State) => {
    state: StoredState,
    references?: SavedObjectReference[],
  };
};

export type EmbeddableTransformsDefinition = {
  type: string;
  versions: { 1: EmbeddableTransforms<any, any> } & Record<
    number,
    EmbeddableTransforms<any, any>
  >;
  latestVersion: number;
};