/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ANNOUNCEMENT_MAX_BATCH_MS,
  ANNOUNCEMENT_SETTLE_MS,
  AnnouncementQueue,
  estimateReadingTimeMs,
} from './announcement_queue';

describe('AnnouncementQueue', () => {
  let onAnnounce: jest.Mock;
  let queue: AnnouncementQueue;

  const getAnnouncedMessages = () => onAnnounce.mock.calls.map(([{ messages }]) => messages);

  beforeEach(() => {
    jest.useFakeTimers();
    onAnnounce = jest.fn();
    queue = new AnnouncementQueue(onAnnounce);
  });

  afterEach(() => {
    queue.stop();
    jest.useRealTimers();
  });

  it('announces a message once no other message arrived for the settle time', () => {
    queue.add('Rule exported');

    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS - 1);
    expect(onAnnounce).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(getAnnouncedMessages()).toEqual([['Rule exported']]);
  });

  it('announces messages that arrive close together as one announcement, in order', () => {
    queue.add('Success: Rule exported');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS - 100);
    queue.add('Detection rules - Elastic');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);

    expect(getAnnouncedMessages()).toEqual([
      ['Success: Rule exported', 'Detection rules - Elastic'],
    ]);
  });

  it('stops batching after the maximum batch time while messages keep arriving', () => {
    for (let elapsed = 0; elapsed < ANNOUNCEMENT_MAX_BATCH_MS; elapsed += 250) {
      queue.add(`Message ${elapsed}`);
      jest.advanceTimersByTime(250);
    }

    expect(onAnnounce).toHaveBeenCalledTimes(1);
  });

  it('does not interrupt the previous announcement while it is likely still being read', () => {
    queue.add('First');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);
    queue.add('Second');
    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);

    expect(getAnnouncedMessages()).toEqual([['First']]);

    jest.advanceTimersByTime(estimateReadingTimeMs(['First']));
    expect(getAnnouncedMessages()).toEqual([['First'], ['Second']]);
  });

  it('resolves function messages when announcing, and skips empty and repeated messages', () => {
    let toastText = '';
    queue.add(() => toastText);
    queue.add(() => '');
    queue.add('Saved');
    queue.add('  Saved  ');
    toastText = 'Rendered later';

    jest.advanceTimersByTime(ANNOUNCEMENT_SETTLE_MS);

    expect(getAnnouncedMessages()).toEqual([['Rendered later', 'Saved']]);

    queue.add(() => '');
    jest.runAllTimers();

    expect(onAnnounce).toHaveBeenCalledTimes(1);
  });

  it('drops pending messages when stopped', () => {
    queue.add('Saved');
    queue.stop();
    jest.runAllTimers();

    expect(onAnnounce).not.toHaveBeenCalled();
  });
});
