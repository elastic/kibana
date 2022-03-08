/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LifecyclePhase } from './lifecycle_phase';

import { Suite, Test } from '../fake_mocha_types';

export class Lifecycle {
  /** lifecycle phase that will run handlers once before tests execute */
  public readonly beforeTests = new LifecyclePhase<[Suite]>({
    singular: true,
  });
  /** lifecycle phase that runs handlers before each runnable (test and hooks) */
  public readonly beforeEachRunnable = new LifecyclePhase<[Test]>();
  /** lifecycle phase that runs handlers before each suite */
  public readonly beforeTestSuite = new LifecyclePhase<[Suite]>();
  /** lifecycle phase that runs handlers before each test */
  public readonly beforeEachTest = new LifecyclePhase<[Test]>();
  /** lifecycle phase that runs handlers after each suite */
  public readonly afterTestSuite = new LifecyclePhase<[Suite]>();
  /** lifecycle phase that runs handlers after a test fails */
  public readonly testFailure = new LifecyclePhase<[Error, Test]>();
  /** lifecycle phase that runs handlers after a hook fails */
  public readonly testHookFailure = new LifecyclePhase<[Error, Test]>();
  /** lifecycle phase that runs handlers at the very end of execution */
  public readonly cleanup = new LifecyclePhase<[]>({
    singular: true,
  });
}
