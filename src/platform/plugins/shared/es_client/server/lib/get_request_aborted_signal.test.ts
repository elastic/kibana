/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import { getRequestAbortedSignal } from './get_request_aborted_signal';

describe('WHEN creating a signal from request aborts', () => {
  it('SHOULD abort WHEN the request is aborted', () => {
    const aborted$ = new Subject<void>();
    const signal = getRequestAbortedSignal(aborted$);

    expect(signal.aborted).toBe(false);
    aborted$.next();
    expect(signal.aborted).toBe(true);
  });
});
