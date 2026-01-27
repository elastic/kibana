/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRestorableStateProvider } from '@kbn/restorable-state';
import type { Dimension } from './types';

export interface MetricsExperienceRestorableState {
  // Pagination page index
  currentPage: number;

  // User search query
  searchTerm: string;

  // Fullscreen mode state
  isFullscreen: boolean;

  // Selected dimensions
  selectedDimensions: Dimension[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TracesRestorableState {}
export type UnifiedMetricsGridRestorableState =
  | MetricsExperienceRestorableState
  | TracesRestorableState;

// TODO: This definition has to be unique per RestorableState.
// We need to create a folder for metrics experience components
// and move this createRestorableStateProvider into the new folder
export const { withRestorableState, useRestorableState } =
  createRestorableStateProvider<MetricsExperienceRestorableState>();
