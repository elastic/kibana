/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
