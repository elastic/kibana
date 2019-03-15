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

import { inspect } from 'util';

const FAIL_TAG = Symbol('fail error');

interface FailError extends Error {
  exitCode: number;
  [FAIL_TAG]: true;
}

export function createFailError(reason: string, exitCode = 1): FailError {
  return Object.assign(new Error(reason), {
    exitCode,
    [FAIL_TAG]: true as true,
  });
}

export function isFailError(error: any): error is FailError {
  return Boolean(error && error[FAIL_TAG]);
}

export function combineErrors(errors: Array<Error | FailError>) {
  if (errors.length === 1) {
    return errors[0];
  }

  const exitCode = errors
    .filter(isFailError)
    .reduce((acc, error) => Math.max(acc, error.exitCode), 1);

  const message = errors.reduce((acc, error) => {
    if (isFailError(error)) {
      return acc + '\n' + error.message;
    }

    return acc + `\nUNHANDLED ERROR\n${inspect(error)}`;
  }, '');

  return createFailError(`${errors.length} errors:\n${message}`, exitCode);
}
