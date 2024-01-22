/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type EmbeddableComponent<ApiType extends unknown = unknown> =
  React.ForwardRefExoticComponent<React.RefAttributes<ApiType>>;

export interface EmbeddableComponentFactory<
  StateType extends unknown = unknown,
  APIType extends unknown = unknown
> {
  getComponent: (initialState: StateType) => Promise<EmbeddableComponent<APIType>>;
  deserializeState: (state: unknown) => StateType;
}
