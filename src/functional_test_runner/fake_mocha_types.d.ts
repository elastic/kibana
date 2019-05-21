/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * The real mocha types conflict with the global jest types, because
 * globals are terrible. So instead of using any for everything this
 * tries to mock out simple versions of the Mocha types
 */

import EventEmitter from 'events';

export interface Suite {
  suites: Suite[];
  tests: Test[];
}

export interface Test {
  fullTitle(): string;
}

export interface Runner extends EventEmitter {
  abort(): void;
  failures: any[];
}

export interface Mocha {
  run(cb: () => void): Runner;
}
