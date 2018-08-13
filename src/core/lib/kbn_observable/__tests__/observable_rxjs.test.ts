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

import { from, of } from 'rxjs';
import { isObservable } from '../lib/is_observable';
import { Observable } from '../observable';

// Test that rxjs observable and kbn-observable are interoperable.
describe('interoperability', () => {
  it('understood by rxjs of kbn-observables', () => {
    const obs = Observable.of([1, 2, 3]);
    expect(() => {
      from(obs);
    }).not.toThrowError(TypeError);
  });

  it('understood by kbn-observable of rxjs observables', () => {
    const rxobs = of([1, 2, 3]);
    expect(isObservable(rxobs)).toBeTruthy();
  });
});
