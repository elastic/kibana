/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, ReplaySubject, take } from 'rxjs';
import { analyticsClientMock } from './analytics_service.test.mocks';
import { trackClicks } from './track_clicks';

describe('trackClicks', () => {
  const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers the analytics event type and a listener to the "click" events', () => {
    trackClicks(analyticsClientMock, true);

    expect(analyticsClientMock.registerEventType).toHaveBeenCalledTimes(1);
    expect(analyticsClientMock.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'click',
      })
    );
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
  });

  test('reports an analytics event when a click event occurs', async () => {
    // Gather an actual "click" event
    const event$ = new ReplaySubject<MouseEvent>(1);
    const parent = document.createElement('div');
    parent.setAttribute('data-test-subj', 'test-click-target-parent');
    const element = document.createElement('button');
    parent.appendChild(element);
    element.setAttribute('data-test-subj', 'test-click-target');
    element.innerText = 'test'; // Only to validate that it is not included in the event.
    element.value = 'test'; // Only to validate that it is not included in the event.
    element.addEventListener('click', (e) => event$.next(e));
    element.click();
    // Using an observable because the event might not be immediately available
    const event = await firstValueFrom(event$.pipe(take(1)));
    event$.complete(); // No longer needed

    trackClicks(analyticsClientMock, true);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    (addEventListenerSpy.mock.calls[0][1] as EventListener)(event);
    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(1);
    expect(analyticsClientMock.reportEvent).toHaveBeenCalledWith('click', {
      target: [
        'DIV',
        'data-test-subj=test-click-target-parent',
        'BUTTON',
        'data-test-subj=test-click-target',
      ],
    });
  });

  test('handles any processing errors logging them in dev mode', async () => {
    trackClicks(analyticsClientMock, true);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    // A basic MouseEvent does not have a target and will fail the logic, making it go to the catch branch as intended.
    (addEventListenerSpy.mock.calls[0][1] as EventListener)(new MouseEvent('click'));
    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(0);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Failed to report the click event",
        Object {
          "error": [TypeError: Cannot read properties of null (reading 'parentElement')],
          "event": MouseEvent {
            "isTrusted": false,
          },
        },
      ]
    `);
  });

  test('trims values longer than 256 chars', async () => {
    // Gather an actual "click" event
    const event$ = new ReplaySubject<MouseEvent>(1);
    const parent = document.createElement('div');
    parent.setAttribute('data-test-subj', 'test-click-target-parent');
    const element = document.createElement('button');
    parent.appendChild(element);
    const reallyLongText = `test-click-target-${new Array(10000).fill('0').join('')}`;
    element.setAttribute('data-test-subj', reallyLongText);
    element.innerText = 'test'; // Only to validate that it is not included in the event.
    element.value = 'test'; // Only to validate that it is not included in the event.
    element.addEventListener('click', (e) => event$.next(e));
    element.click();
    // Using an observable because the event might not be immediately available
    const event = await firstValueFrom(event$.pipe(take(1)));
    event$.complete(); // No longer needed

    trackClicks(analyticsClientMock, true);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    (addEventListenerSpy.mock.calls[0][1] as EventListener)(event);
    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(1);
    expect(analyticsClientMock.reportEvent).toHaveBeenCalledWith('click', {
      target: [
        'DIV',
        'data-test-subj=test-click-target-parent',
        'BUTTON',
        `data-test-subj=test-click-target-${new Array(256 - 33).fill('0').join('')}`,
      ],
    });
  });

  test('swallows any processing errors when not in dev mode', async () => {
    trackClicks(analyticsClientMock, false);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    // A basic MouseEvent does not have a target and will fail the logic, making it go to the catch branch as intended.
    (addEventListenerSpy.mock.calls[0][1] as EventListener)(new MouseEvent('click'));
    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(0);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
  });
});
