/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OverlayStart } from '@kbn/core-overlays-browser';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { getUserConfirmationHandler, ConfirmHandler } from './navigation_confirm';

const nextTick = () => new Promise((resolve) => setImmediate(resolve));

describe('getUserConfirmationHandler', () => {
  let overlayStart: ReturnType<typeof overlayServiceMock.createStartContract>;
  let overlayPromise: Promise<OverlayStart>;
  let resolvePromise: Function;
  let rejectPromise: Function;
  let fallbackHandler: jest.MockedFunction<ConfirmHandler>;
  let handler: ConfirmHandler;

  beforeEach(() => {
    overlayStart = overlayServiceMock.createStartContract();
    overlayPromise = new Promise((resolve, reject) => {
      resolvePromise = () => resolve(overlayStart);
      rejectPromise = () => reject('some error');
    });
    fallbackHandler = jest.fn().mockImplementation((message, callback) => {
      callback(true);
    });

    handler = getUserConfirmationHandler({
      overlayPromise,
      fallbackHandler,
    });
  });

  it('uses the fallback handler if the promise is not resolved yet', () => {
    const callback = jest.fn();
    handler('foo', callback);

    expect(fallbackHandler).toHaveBeenCalledTimes(1);
    expect(fallbackHandler).toHaveBeenCalledWith('foo', callback);
  });

  it('calls the callback with the value returned by the fallback handler', async () => {
    const callback = jest.fn();
    handler('foo', callback);

    expect(fallbackHandler).toHaveBeenCalledTimes(1);
    expect(fallbackHandler).toHaveBeenCalledWith('foo', callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(true);
  });

  it('uses the overlay handler once the promise is resolved', async () => {
    resolvePromise();
    await nextTick();

    const callback = jest.fn();
    handler('foo', callback);

    expect(fallbackHandler).not.toHaveBeenCalled();

    expect(overlayStart.openConfirm).toHaveBeenCalledTimes(1);
    expect(overlayStart.openConfirm).toHaveBeenCalledWith('foo', expect.any(Object));
  });

  it('calls the callback with the value returned by `openConfirm`', async () => {
    overlayStart.openConfirm.mockResolvedValue(true);

    resolvePromise();
    await nextTick();

    const callback = jest.fn();
    handler('foo', callback);

    await nextTick();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(true);
  });

  it('uses the fallback handler if the promise rejects', async () => {
    rejectPromise();
    await nextTick();

    const callback = jest.fn();
    handler('foo', callback);

    expect(fallbackHandler).toHaveBeenCalledTimes(1);
    expect(overlayStart.openConfirm).not.toHaveBeenCalled();
  });
});
