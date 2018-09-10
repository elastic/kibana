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

/*
 * A handful of helper functions for testing the task manager.
 */

import sinon from 'sinon';

/**
 * Creates a mock task manager Logger.
 */
export function mockLogger() {
  return {
    info: sinon.stub(),
    debug: sinon.stub(),
    warning: sinon.stub(),
    error: sinon.stub(),
  };
}

interface Resolvable {
  resolve: () => void;
}

/**
 * Creates a promise which can be resolved externally, useful for
 * coordinating async tests.
 */
export function resolvable(): PromiseLike<void> & Resolvable {
  let resolve: () => void;
  const result = new Promise<void>(r => (resolve = r)) as any;

  result.resolve = () => setTimeout(resolve, 0);

  return result;
}

/**
 * A simple helper for waiting a specified number of milliseconds.
 *
 * @param {number} ms
 */
export async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
