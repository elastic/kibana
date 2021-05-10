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
  public readonly beforeTests = new LifecyclePhase<[Suite]>({
    singular: true,
  });
  public readonly beforeEachRunnable = new LifecyclePhase<[Test]>();
  public readonly beforeTestSuite = new LifecyclePhase<[Suite]>();
  public readonly beforeEachTest = new LifecyclePhase<[Test]>();
  public readonly afterTestSuite = new LifecyclePhase<[Suite]>();
  public readonly testFailure = new LifecyclePhase<[Error, Test]>();
  public readonly testHookFailure = new LifecyclePhase<[Error, Test]>();
  public readonly cleanup = new LifecyclePhase<[]>({
    singular: true,
  });
}
