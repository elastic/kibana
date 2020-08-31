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

import { Subject } from 'rxjs';
import { getRequestAbortedSignal } from './get_request_aborted_signal';

describe('abortableRequestHandler', () => {
  jest.useFakeTimers();

  it('should call abort if disconnected', () => {
    const abortedSubject = new Subject<void>();
    const aborted$ = abortedSubject.asObservable();
    const onAborted = jest.fn();

    const signal = getRequestAbortedSignal(aborted$);
    signal.addEventListener('abort', onAborted);

    // Shouldn't be aborted or call onAborted prior to disconnecting
    expect(signal.aborted).toBe(false);
    expect(onAborted).not.toBeCalled();

    abortedSubject.next();
    jest.runAllTimers();

    // Should be aborted and call onAborted after disconnecting
    expect(signal.aborted).toBe(true);
    expect(onAborted).toBeCalled();
  });
});
