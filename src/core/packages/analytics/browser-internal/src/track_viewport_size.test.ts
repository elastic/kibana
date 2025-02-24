/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, take, type Subscription, toArray } from 'rxjs';
import { analyticsClientMock } from './analytics_service.test.mocks';
import { trackViewportSize } from './track_viewport_size';

describe('trackViewportSize', () => {
  const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  let subscription: Subscription | undefined;

  afterEach(() => {
    subscription?.unsubscribe();
    jest.resetAllMocks();
  });

  test('registers the analytics event type, the context provider, and a listener to the "resize" events', () => {
    subscription = trackViewportSize(analyticsClientMock);

    expect(analyticsClientMock.registerContextProvider).toHaveBeenCalledTimes(1);
    expect(analyticsClientMock.registerContextProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'viewport_size',
      })
    );

    expect(analyticsClientMock.registerEventType).toHaveBeenCalledTimes(1);
    expect(analyticsClientMock.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'viewport_resize',
      })
    );
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function), undefined);
  });

  test('emits a context update before the resize occurs', async () => {
    subscription = trackViewportSize(analyticsClientMock);

    const { context$ } = analyticsClientMock.registerContextProvider.mock.calls[0][0];
    await expect(firstValueFrom(context$.pipe(take(1)))).resolves.toStrictEqual({
      viewport_width: 1024,
      viewport_height: 768,
    });
  });

  test('reports an analytics event when a resize event occurs', async () => {
    subscription = trackViewportSize(analyticsClientMock);

    const { context$ } = analyticsClientMock.registerContextProvider.mock.calls[0][0];

    // window.resizeTo(100, 100) wouldn't trigger the event in Jest, so we need to call the listener straight away.
    // eslint-disable-next-line dot-notation
    window['innerWidth'] = 100;
    // eslint-disable-next-line dot-notation
    window['innerHeight'] = 100;

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    (addEventListenerSpy.mock.calls[0][1] as Function)();

    await expect(firstValueFrom(context$.pipe(take(2), toArray()))).resolves.toStrictEqual([
      { viewport_width: 1024, viewport_height: 768 },
      { viewport_width: 100, viewport_height: 100 },
    ]);

    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(1);
    expect(analyticsClientMock.reportEvent).toHaveBeenCalledWith('viewport_resize', {
      viewport_width: 100,
      viewport_height: 100,
    });
  });
});
