/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import { Subject } from 'rxjs';
import type { AnnouncementMessage, QueuedMessage } from './announcement_queue';
import {
  ANNOUNCEMENT_MAX_BATCH_MS,
  ANNOUNCEMENT_SETTLE_MS,
  MAX_READING_TIME_MS,
  estimateReadingTimeMs,
  toAnnouncements,
} from './announcement_queue';

// Read for about 3s, long enough for two more batches to close meanwhile
const LONG_MESSAGE = 'Success: Detection rule "High CPU usage" was created';

describe('toAnnouncements', () => {
  let messages$: Subject<QueuedMessage>;
  let onAnnounce: jest.Mock;
  let subscription: Subscription;

  const notify = (
    message: AnnouncementMessage,
    { politeness = 'polite', key }: Partial<Omit<QueuedMessage, 'message'>> = {}
  ) => messages$.next({ message, politeness, key });

  const getAnnouncedTexts = (): string[][] =>
    onAnnounce.mock.calls.map(([{ messages }]) =>
      messages.map(({ text }: { text: string }) => text)
    );

  beforeEach(() => {
    jest.useFakeTimers();
    messages$ = new Subject();
    onAnnounce = jest.fn();
    subscription = toAnnouncements(messages$).subscribe(onAnnounce);
  });

  afterEach(() => {
    subscription.unsubscribe();
    jest.useRealTimers();
  });

  it('announces a message once no other message arrived for the settle time', () => {
    notify('Rule exported');

    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS - 1);
    expect(onAnnounce).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(getAnnouncedTexts()).toEqual([['Rule exported']]);
  });

  it('announces messages that arrive close together as one announcement, in order', () => {
    notify('Success: Rule exported', { politeness: 'assertive' });
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS - 100);
    notify('Detection rules - Elastic');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);

    expect(onAnnounce.mock.calls[0][0].messages).toEqual([
      { text: 'Success: Rule exported', politeness: 'assertive', key: undefined },
      { text: 'Detection rules - Elastic', politeness: 'polite', key: undefined },
    ]);
  });

  it('stops batching after the maximum batch time while messages keep arriving', () => {
    for (let elapsed = 0; elapsed < ANNOUNCEMENT_MAX_BATCH_MS; elapsed += 250) {
      notify(`Message ${elapsed}`);
      jest.advanceTimersByTime(250);
    }

    expect(onAnnounce).toHaveBeenCalledTimes(1);
  });

  it('merges messages that arrive while the previous announcement is read into one announcement', () => {
    notify(LONG_MESSAGE);
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);
    notify('Second');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS * 2);
    notify('Third');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);

    expect(getAnnouncedTexts()).toEqual([[LONG_MESSAGE]]);

    jest.advanceTimersByTime(estimateReadingTimeMs([{ text: LONG_MESSAGE, politeness: 'polite' }]));
    expect(getAnnouncedTexts()).toEqual([[LONG_MESSAGE], ['Second', 'Third']]);
  });

  it('caps how long an announcement holds up the next one', () => {
    notify('x'.repeat(1000));
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);
    notify('Next');
    jest.advanceTimersByTime(MAX_READING_TIME_MS);

    expect(getAnnouncedTexts()[1]).toEqual(['Next']);
  });

  it('resolves function messages when their batch closes, and skips empty and repeated ones', () => {
    notify('First');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);

    let toastText = '';
    notify(() => toastText);
    notify(() => '');
    notify('Saved');
    notify('  Saved  ');
    toastText = 'Rendered later';
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);
    // e.g. the toast expired while the previous announcement was read
    toastText = '';
    jest.runAllTimers();

    expect(getAnnouncedTexts()).toEqual([['First'], ['Rendered later', 'Saved']]);
  });

  it('replaces a waiting message with the same key', () => {
    notify(LONG_MESSAGE);
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);
    notify('12 results', { key: 'results' });
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS * 2);
    notify('10 results', { key: 'results' });
    jest.runAllTimers();

    expect(getAnnouncedTexts()).toEqual([[LONG_MESSAGE], ['10 results']]);
  });

  it('removes a waiting message with the same key as soon as a newer one arrives', () => {
    const readingTimeMs = estimateReadingTimeMs([{ text: LONG_MESSAGE, politeness: 'polite' }]);
    notify(LONG_MESSAGE);
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);
    notify('Dashboards - Elastic', { key: 'pageTitle' });
    // The new title arrives shortly before the previous announcement is read
    jest.advanceTimersByTime(readingTimeMs - ANNOUNCEMENT_SETTLE_MS / 2);
    notify('Discover - Elastic', { key: 'pageTitle' });
    jest.runAllTimers();

    expect(getAnnouncedTexts()).toEqual([[LONG_MESSAGE], ['Discover - Elastic']]);
  });

  it('skips a message that fails to resolve and keeps announcing others', () => {
    notify(() => {
      throw new Error('Failed to read toast');
    });
    notify('Saved');
    jest.runAllTimers();
    notify('Deleted');
    jest.runAllTimers();

    expect(getAnnouncedTexts()).toEqual([['Saved'], ['Deleted']]);
  });

  it('drops waiting messages when unsubscribed', () => {
    notify('Saved');
    subscription.unsubscribe();
    jest.runAllTimers();

    expect(onAnnounce).not.toHaveBeenCalled();
  });
});
