/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { ToolingLog } from '@kbn/tooling-log';

import { LifecyclePhase } from './lifecycle_phase';

import { Suite, Test } from '../fake_mocha_types';

export class Lifecycle {
  /** root subscription to cleanup lifecycle phases when lifecycle completes */
  private readonly sub = new Rx.Subscription();

  /** lifecycle phase that will run handlers once before tests execute */
  public readonly beforeTests = new LifecyclePhase<[Suite]>(this.sub, {
    singular: true,
  });
  /** lifecycle phase that runs handlers before each runnable (test and hooks) */
  public readonly beforeEachRunnable = new LifecyclePhase<[Test]>(this.sub);
  /** lifecycle phase that runs handlers before each suite */
  public readonly beforeTestSuite = new LifecyclePhase<[Suite]>(this.sub);
  /** lifecycle phase that runs handlers before each test */
  public readonly beforeEachTest = new LifecyclePhase<[Test]>(this.sub);
  /** lifecycle phase that runs handlers after each suite */
  public readonly afterTestSuite = new LifecyclePhase<[Suite]>(this.sub);
  /** lifecycle phase that runs handlers after a test fails */
  public readonly testFailure = new LifecyclePhase<[Error, Test]>(this.sub);
  /** lifecycle phase that runs handlers after a hook fails */
  public readonly testHookFailure = new LifecyclePhase<[Error, Test]>(this.sub);
  /** lifecycle phase that runs handlers at the very end of execution */
  public readonly cleanup = new LifecyclePhase<[]>(this.sub, {
    singular: true,
  });

  constructor(log: ToolingLog) {
    for (const [name, phase] of Object.entries(this)) {
      if (phase instanceof LifecyclePhase) {
        phase.before$.subscribe(() => log.verbose('starting %j lifecycle phase', name));
        phase.after$.subscribe(() => log.verbose('starting %j lifecycle phase', name));
      }
    }

    // after the singular cleanup lifecycle phase completes unsubscribe from the root subscription
    this.cleanup.after$.pipe(Rx.materialize()).subscribe((n) => {
      if (n.kind === 'C') {
        this.sub.unsubscribe();
      }
    });
  }
}
