/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The real mocha types conflict with the global jest types, because
 * globals are terrible. So instead of using any for everything this
 * tries to mock out simple versions of the Mocha types
 */

import { EventEmitter } from 'events';

export interface Suite {
  suites: Suite[];
  tests: Test[];
  title: string;
  file: string;
  parent?: Suite;
  eachTest: (cb: (test: Test) => void) => void;
  root: boolean;
  suiteTag: string;
}

export interface Test {
  fullTitle(): string;
  title: string;
  file?: string;
  parent?: Suite;
  isPassed: () => boolean;
  pending?: boolean;
}

export interface Runner extends EventEmitter {
  abort(): void;
  failures: any[];
}

export interface Mocha {
  run(cb: () => void): Runner;
}
