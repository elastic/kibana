/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElementTarget } from '@elastic/eui';
import type { ReactNode } from 'react';

export type TourStepId = 'sidenav-home' | 'sidenav-more' | 'sidenav-manage-data';

export interface TourStep {
  id: TourStepId;
  title: ReactNode;
  content: ReactNode;
  target: ElementTarget;
  required: boolean;
}

export interface TourState {
  status: 'idle' | 'waiting' | 'active' | 'completed' | 'skipped';
  currentStepIndex: number;
  steps: TourStep[];
}
