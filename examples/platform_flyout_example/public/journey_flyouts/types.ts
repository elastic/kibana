/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StateManager, WithAllKeys } from '@kbn/presentation-publishing';

export interface FlyoutEntry<StateType extends object = {}> {
  Component: React.FC<FlyoutProps<StateType>>;
  width: number;
  initialState?: WithAllKeys<StateType>;
}

export interface FlyoutProps<ThisFlyoutState extends object = {}> {
  openNextFlyout: <NextFlyoutState extends object = {}>(
    entry: FlyoutEntry<NextFlyoutState>
  ) => void;
  openChildFlyout: <ChildFlyoutState extends object = {}>(
    entry: FlyoutEntry<ChildFlyoutState>
  ) => void;
  stateManager: StateManager<ThisFlyoutState>;
}

export interface FlyoutApi {
  openFlyout: <InitialFlyoutState extends object = {}>(
    entry: FlyoutEntry<InitialFlyoutState>
  ) => void;
}
