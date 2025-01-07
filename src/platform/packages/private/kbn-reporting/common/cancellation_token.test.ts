/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CancellationToken } from './cancellation_token';

describe('Cancellation Token', () => {
  it('registers callbacks for cancellation events', () => {
    const cancellationToken = new CancellationToken();
    const onCancelled = jest.fn();
    cancellationToken.on(onCancelled);
    cancellationToken.cancel();

    expect(onCancelled).toBeCalled();
  });

  it('emits a cancellation event immediately when already cancelled', () => {
    const cancellationToken = new CancellationToken();
    const onCancelled = jest.fn();
    cancellationToken.cancel();
    cancellationToken.on(onCancelled);

    expect(onCancelled).toBeCalled();
  });

  it('binds the `on` method properly so that it can be passed around', () => {
    const cancellationToken = new CancellationToken();
    const onCancelled = jest.fn();
    const unboundOn = cancellationToken.on;

    cancellationToken.cancel();
    unboundOn(onCancelled);

    expect(onCancelled).toBeCalled();
  });

  it('binds the `cancel` method properly so that it can be passed around', () => {
    const cancellationToken = new CancellationToken();
    const onCancelled = jest.fn();
    const unboundCancel = cancellationToken.cancel;

    unboundCancel();
    cancellationToken.on(onCancelled);

    expect(onCancelled).toBeCalled();
  });
});
