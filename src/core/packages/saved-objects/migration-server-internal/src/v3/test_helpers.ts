/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IO } from './io';
import { createInitialState, type State } from './state';
import * as CHECK_SOURCE from './steps/check_source';
import * as CREATE_TARGET from './steps/create_target';
import * as INIT from './steps/init';
import * as MARK_READY from './steps/mark_ready';

export const io: IO = {
  init: async () => ({ type: 'started' }),
  checkSource: async () => ({ type: 'source_found', sourceIndex: '.kibana_1' }),
  createTarget: async () => ({ type: 'target_created', targetIndex: '.kibana_1_v3' }),
  markReady: async () => ({ type: 'ready' }),
};

export interface TransitionCase {
  readonly title: string;
  readonly run: () => {
    readonly from: State;
    readonly to: State;
  };
}

export const createCheckSourceState = (): CHECK_SOURCE.State => ({
  name: CHECK_SOURCE.Name,
  retryAttempts: 3,
  retryCount: 0,
  logs: [],
});

export const createCreateTargetState = (retryCount = 0): CREATE_TARGET.State => ({
  name: CREATE_TARGET.Name,
  retryAttempts: 3,
  retryCount,
  logs: [],
  sourceIndex: '.kibana_1',
});

export const createMarkReadyState = (): MARK_READY.State => ({
  name: MARK_READY.Name,
  retryAttempts: 3,
  retryCount: 0,
  logs: [],
  targetIndex: '.kibana_1_v3',
});

export const transitionCases: readonly TransitionCase[] = [
  {
    title: 'INIT started',
    run: () => {
      const from = createInitialState(3);
      return {
        from,
        to: INIT.step(from, io).transition({ type: 'started' }),
      };
    },
  },
  {
    title: 'CHECK_SOURCE source_found',
    run: () => {
      const from = createCheckSourceState();
      return {
        from,
        to: CHECK_SOURCE.step(from, io).transition({
          type: 'source_found',
          sourceIndex: '.kibana_1',
        }),
      };
    },
  },
  {
    title: 'CHECK_SOURCE source_missing',
    run: () => {
      const from = createCheckSourceState();
      return {
        from,
        to: CHECK_SOURCE.step(from, io).transition({
          type: 'source_missing',
          reason: 'missing source',
        }),
      };
    },
  },
  {
    title: 'CREATE_TARGET target_created',
    run: () => {
      const from = createCreateTargetState();
      return {
        from,
        to: CREATE_TARGET.step(from, io).transition({
          type: 'target_created',
          targetIndex: '.kibana_1_v3',
        }),
      };
    },
  },
  {
    title: 'CREATE_TARGET retryable_failure self-loop',
    run: () => {
      const from = createCreateTargetState();
      return {
        from,
        to: CREATE_TARGET.step(from, io).transition({
          type: 'retryable_failure',
          message: 'target shard unavailable',
        }),
      };
    },
  },
  {
    title: 'CREATE_TARGET retryable_failure exhausted',
    run: () => {
      const from = createCreateTargetState(3);
      return {
        from,
        to: CREATE_TARGET.step(from, io).transition({
          type: 'retryable_failure',
          message: 'target shard unavailable',
        }),
      };
    },
  },
  {
    title: 'CREATE_TARGET fatal_failure',
    run: () => {
      const from = createCreateTargetState();
      return {
        from,
        to: CREATE_TARGET.step(from, io).transition({
          type: 'fatal_failure',
          reason: 'security exception',
        }),
      };
    },
  },
  {
    title: 'MARK_READY ready',
    run: () => {
      const from = createMarkReadyState();
      return {
        from,
        to: MARK_READY.step(from, io).transition({
          type: 'ready',
        }),
      };
    },
  },
  {
    title: 'MARK_READY fatal_failure',
    run: () => {
      const from = createMarkReadyState();
      return {
        from,
        to: MARK_READY.step(from, io).transition({
          type: 'fatal_failure',
          reason: 'alias update failed',
        }),
      };
    },
  },
];
