/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { LifecyclePhase } from './lifecycle_phase';

// mocha's global types mean we can't import Mocha or it will override the global jest types..............
type ItsASuite = any;
type ItsATest = any;
type ItsARunnable = any;

export class Lifecycle {
  public readonly beforeTests = new LifecyclePhase<[]>({
    singular: true,
  });
  public readonly beforeEachRunnable = new LifecyclePhase<[ItsARunnable]>();
  public readonly beforeTestSuite = new LifecyclePhase<[ItsASuite]>();
  public readonly beforeEachTest = new LifecyclePhase<[ItsATest]>();
  public readonly afterTestSuite = new LifecyclePhase<[ItsASuite]>();
  public readonly testFailure = new LifecyclePhase<[Error, ItsATest]>();
  public readonly testHookFailure = new LifecyclePhase<[Error, ItsATest]>();
  public readonly cleanup = new LifecyclePhase<[]>({
    singular: true,
  });
}
