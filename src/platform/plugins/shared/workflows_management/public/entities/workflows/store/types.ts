/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnhancedStore } from '@reduxjs/toolkit';
import type { WorkflowDetailState } from './workflow_detail/types';

export interface RootState {
  detail: WorkflowDetailState;
}

export type WorkflowsStore = EnhancedStore<RootState>;
export type AppDispatch = WorkflowsStore['dispatch'];
