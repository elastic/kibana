/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InTableSearchRestorableState } from '@kbn/data-grid-in-table-search/src/types';
import { createRestorableStateProvider } from '@kbn/restorable-state';

type SelectedDocId = string;

export interface UnifiedDataTableRestorableState {
  selectedDocsMap: Record<SelectedDocId, boolean>;
  isFilterActive: boolean;
  isCompareActive: boolean;
  pageIndex: number;
  inTableSearch?: InTableSearchRestorableState;
}

export const { withRestorableState, useRestorableState, useRestorableRef } =
  createRestorableStateProvider<UnifiedDataTableRestorableState>();
