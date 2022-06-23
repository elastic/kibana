/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export * from '../../../common/types';

export type DashboardLoadedEventStatus = 'done' | 'error';

export interface DashboardLoadedEvent {
  // Time from start to when data is loaded
  timeToData: number;
  // Time from start until render or error
  timeToDone: number;
  numOfPanels: number;
  status: DashboardLoadedEventStatus;
}
