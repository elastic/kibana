/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { PanelPlacementStrategy } from './constants';

export interface PanelPlacementSettings {
  strategy?: PanelPlacementStrategy;
  height?: number;
  width?: number;
}
export interface PanelResizeSettings {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export type PanelSettings = Partial<{
  placementSettings: PanelPlacementSettings;
  resizeSettings: PanelResizeSettings;
}>;

export type PanelSettingsGetter<SerializedState extends object = object> = (
  serializedState?: SerializedState
) => MaybePromise<PanelSettings>;
