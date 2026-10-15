/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, screen } from '@testing-library/react';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { ANNOUNCEMENT_SETTLE_MS, estimateReadingTimeMs } from './announcement_queue';
import type { InternalScreenReaderStart } from './screen_reader_service';
import { ScreenReaderService } from './screen_reader_service';

describe('ScreenReaderService', () => {
  let service: ScreenReaderService;
  let targetDomElement: HTMLElement;

  const startService = (): InternalScreenReaderStart => {
    let screenReader: InternalScreenReaderStart | undefined;
    act(() => {
      screenReader = service.start({ rendering: renderingServiceMock.create(), targetDomElement });
    });
    if (!screenReader) {
      throw new Error('ScreenReaderService did not start');
    }
    return screenReader;
  };

  const advanceTimers = (ms: number) =>
    act(() => {
      jest.advanceTimersByTime(ms);
    });

  const getLiveRegion = () => screen.getByTestId('screenReaderAnnouncer');

  beforeEach(() => {
    jest.useFakeTimers();
    service = new ScreenReaderService();
    targetDomElement = document.createElement('div');
    document.body.appendChild(targetDomElement);
  });

  afterEach(() => {
    act(() => service.stop());
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('announces notified messages through an assertive live region in the target element', () => {
    const screenReader = startService();

    screenReader.notify('Success: Rule exported');
    screenReader.notify('Detection rules - Elastic');
    advanceTimers(ANNOUNCEMENT_SETTLE_MS);

    const liveRegion = getLiveRegion();
    expect(targetDomElement.contains(liveRegion)).toBe(true);
    expect(liveRegion.getAttribute('role')).toBe('alert');
    expect(liveRegion.getAttribute('aria-live')).toBe('assertive');
    expect([...liveRegion.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
      'Success: Rule exported',
      'Detection rules - Elastic',
    ]);
  });

  it('keeps the latest announcement until the next one replaces it', () => {
    const screenReader = startService();

    screenReader.notify('Success: Space "Default" was saved');
    advanceTimers(ANNOUNCEMENT_SETTLE_MS);
    // Screen readers may read the region seconds later, e.g. after describing a new page
    advanceTimers(30_000);

    expect(getLiveRegion().textContent).toBe('Success: Space "Default" was saved');
  });

  it('inserts new nodes when the same message is announced again', () => {
    const screenReader = startService();

    screenReader.notify('Saved');
    advanceTimers(ANNOUNCEMENT_SETTLE_MS);
    const firstMessage = getLiveRegion().querySelector('p');

    screenReader.notify('Saved');
    advanceTimers(estimateReadingTimeMs(['Saved']));

    const secondMessage = getLiveRegion().querySelector('p');
    expect(secondMessage?.textContent).toBe('Saved');
    expect(secondMessage).not.toBe(firstMessage);
  });
});
