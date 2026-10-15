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
import type { AnnouncementMessage } from './announcement_queue';
import {
  ANNOUNCEMENT_MAX_BATCH_MS,
  ANNOUNCEMENT_SETTLE_MS,
  estimateReadingTimeMs,
  toAnnouncements,
} from './announcement_queue';

describe('toAnnouncements', () => {
  let messages$: Subject<AnnouncementMessage>;
  let onAnnounce: jest.Mock;
  let subscription: Subscription;

  const getAnnouncedMessages = () => onAnnounce.mock.calls.map(([{ messages }]) => messages);

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
    messages$.next('Rule exported');

    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS - 1);
    expect(onAnnounce).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(getAnnouncedMessages()).toEqual([['Rule exported']]);
  });

  it('announces messages that arrive close together as one announcement, in order', () => {
    messages$.next('Success: Rule exported');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS - 100);
    messages$.next('Detection rules - Elastic');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);

    expect(getAnnouncedMessages()).toEqual([
      ['Success: Rule exported', 'Detection rules - Elastic'],
    ]);
  });

  it('stops batching after the maximum batch time while messages keep arriving', () => {
    for (let elapsed = 0; elapsed < ANNOUNCEMENT_MAX_BATCH_MS; elapsed += 250) {
      messages$.next(`Message ${elapsed}`);
      jest.advanceTimersByTime(250);
    }

    expect(onAnnounce).toHaveBeenCalledTimes(1);
  });

  it('does not interrupt the previous announcement while it is likely still being read', () => {
    messages$.next('First');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);
    messages$.next('Second');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);

    expect(getAnnouncedMessages()).toEqual([['First']]);

    jest.advanceTimersByTime(estimateReadingTimeMs(['First']));
    expect(getAnnouncedMessages()).toEqual([['First'], ['Second']]);
  });

  it('resolves function messages when announcing, and skips empty and repeated messages', () => {
    let toastText = '';
    messages$.next(() => toastText);
    messages$.next(() => '');
    messages$.next('Saved');
    messages$.next('  Saved  ');
    toastText = 'Rendered later';

    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);

    expect(getAnnouncedMessages()).toEqual([['Rendered later', 'Saved']]);

    messages$.next(() => '');
    jest.runAllTimers();

    expect(onAnnounce).toHaveBeenCalledTimes(1);
  });

  it('drops pending messages when unsubscribed', () => {
    messages$.next('Saved');
    subscription.unsubscribe();
    jest.runAllTimers();

    expect(onAnnounce).not.toHaveBeenCalled();
  });
});
