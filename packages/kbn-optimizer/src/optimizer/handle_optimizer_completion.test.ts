/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { REPO_ROOT } from '@kbn/repo-info';

import { Update, allValuesFrom } from '../common';

import { OptimizerState } from './optimizer_state';
import { OptimizerConfig } from './optimizer_config';
import { handleOptimizerCompletion } from './handle_optimizer_completion';

const createUpdate$ = (phase: OptimizerState['phase']) =>
  Rx.of<Update<any, OptimizerState>>({
    state: {
      phase,
      compilerStates: [],
      durSec: 0,
      offlineBundles: [],
      onlineBundles: [],
      startTime: Date.now(),
    },
  });

const config = (watch?: boolean) =>
  OptimizerConfig.create({
    repoRoot: REPO_ROOT,
    watch,
  });

it('errors if the optimizer completes when in watch mode', async () => {
  const update$ = createUpdate$('success');

  await expect(
    allValuesFrom(update$.pipe(handleOptimizerCompletion(config(true))))
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"optimizer unexpectedly completed when in watch mode"`
  );
});

it('errors if the optimizer completes in phase "issue"', async () => {
  const update$ = createUpdate$('issue');

  await expect(
    allValuesFrom(update$.pipe(handleOptimizerCompletion(config())))
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"webpack issue"`);
});

it('errors if the optimizer completes in phase "initializing"', async () => {
  const update$ = createUpdate$('initializing');

  await expect(
    allValuesFrom(update$.pipe(handleOptimizerCompletion(config())))
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"optimizer unexpectedly exit in phase \\"initializing\\""`
  );
});

it('errors if the optimizer completes in phase "reallocating"', async () => {
  const update$ = createUpdate$('reallocating');

  await expect(
    allValuesFrom(update$.pipe(handleOptimizerCompletion(config())))
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"optimizer unexpectedly exit in phase \\"reallocating\\""`
  );
});

it('errors if the optimizer completes in phase "running"', async () => {
  const update$ = createUpdate$('running');

  await expect(
    allValuesFrom(update$.pipe(handleOptimizerCompletion(config())))
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"optimizer unexpectedly exit in phase \\"running\\""`
  );
});

it('passes through errors on the source stream', async () => {
  const error = new Error('foo');
  const update$ = Rx.throwError(error);

  await expect(
    allValuesFrom(update$.pipe(handleOptimizerCompletion(config())))
  ).rejects.toThrowError(error);
});
