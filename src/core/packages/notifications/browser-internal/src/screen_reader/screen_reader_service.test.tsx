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
import { ANNOUNCEMENT_CLEAR_MS } from './screen_reader_announcer';

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

  const getStatusRegion = () => screen.getByTestId('screenReaderStatus');
  const getAlertsRegion = () => screen.getByTestId('screenReaderAlerts');
  const getTexts = (region: HTMLElement) =>
    [...region.querySelectorAll('p')].map(({ textContent }) => textContent);

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

  it('announces polite messages in a status region', () => {
    const screenReader = startService();

    screenReader.notify('12 results found');
    advanceTimers(ANNOUNCEMENT_SETTLE_MS);

    const statusRegion = getStatusRegion();
    expect(targetDomElement.contains(statusRegion)).toBe(true);
    expect(statusRegion.getAttribute('role')).toBe('status');
    expect(statusRegion.getAttribute('aria-live')).toBe('polite');
    expect(getTexts(statusRegion)).toEqual(['12 results found']);
    expect(getTexts(getAlertsRegion())).toEqual([]);
  });

  // An assertive update may clear queued polite speech, so a mixed batch uses one region
  it('announces a batch with any assertive message entirely in the alert region', () => {
    const screenReader = startService();

    screenReader.notify('Success: Rule exported', { politeness: 'assertive' });
    screenReader.notify('Detection rules - Elastic');
    advanceTimers(ANNOUNCEMENT_SETTLE_MS);

    const alertsRegion = getAlertsRegion();
    expect(alertsRegion.getAttribute('role')).toBe('alert');
    expect(alertsRegion.getAttribute('aria-live')).toBe('assertive');
    expect(getTexts(alertsRegion)).toEqual(['Success: Rule exported', 'Detection rules - Elastic']);
    expect(getTexts(getStatusRegion())).toEqual([]);
  });

  it('keeps an announcement long enough for late readouts, then clears it', () => {
    const screenReader = startService();

    screenReader.notify('Success: Space "Default" was saved', { politeness: 'assertive' });
    advanceTimers(ANNOUNCEMENT_SETTLE_MS);
    // e.g. VoiceOver first describes the new page after a navigation
    advanceTimers(ANNOUNCEMENT_CLEAR_MS - 1);
    expect(getAlertsRegion().textContent).toBe('Success: Space "Default" was saved');

    advanceTimers(1);
    expect(getAlertsRegion().textContent).toBe('');
  });

  it('inserts new nodes when the same message is announced again', () => {
    const screenReader = startService();

    screenReader.notify('Saved');
    advanceTimers(ANNOUNCEMENT_SETTLE_MS);
    const firstMessage = getStatusRegion().querySelector('p');

    screenReader.notify('Saved');
    advanceTimers(estimateReadingTimeMs([{ text: 'Saved', politeness: 'polite' }]));

    const secondMessage = getStatusRegion().querySelector('p');
    expect(secondMessage?.textContent).toBe('Saved');
    expect(secondMessage).not.toBe(firstMessage);
  });
});
