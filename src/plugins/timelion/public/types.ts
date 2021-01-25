/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface TimelionAppState {
  sheet: string[];
  selected: number;
  columns: number;
  rows: number;
  interval: string;
}

export interface TimelionAppStateTransitions {
  set: (
    state: TimelionAppState
  ) => <T extends keyof TimelionAppState>(prop: T, value: TimelionAppState[T]) => TimelionAppState;
  updateState: (
    state: TimelionAppState
  ) => <T extends keyof TimelionAppState>(newValues: Partial<TimelionAppState>) => TimelionAppState;
}
