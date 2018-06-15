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
 * fetchOrDefault returns the resolved value of the promise, or
 * if the promise rejects with a { status: 404 }, returns the
 * specified default value.
 *
 * @param {Promise<T>} promise - The promise to wrap
 * @param {T} defaultValue - The default value to be returned in the event of a 404
 * @returns {Promise<T>}
 */
export function fetchOrDefault<T>(
  promise: Promise<T>,
  defaultValue: T
): Promise<T> {
  return promise.catch(error => {
    if (error.status === 404) {
      return defaultValue;
    }
    throw error;
  });
}
