/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import {
  EMPTY,
  concat,
  concatMap,
  debounceTime,
  exhaustMap,
  ignoreElements,
  of,
  race,
  startWith,
  takeUntil,
  timer,
  toArray,
} from 'rxjs';

/**
 * A message to announce, or a function returning it when it's announced. Functions let callers
 * read content that renders later, and return an empty string to skip a stale message.
 */
export type AnnouncementMessage = string | (() => string);

export interface Announcement {
  /** Unique per announcement, so that repeating the same messages is announced again. */
  id: number;
  messages: string[];
}

/**
 * How long to wait after the latest message. Messages caused by the same action (e.g. a toast and a
 * page change) are announced together, and focus changes caused by that action (e.g. a closed flyout
 * returning focus) happen first, so the announcement interrupts their readout instead of the other
 * way around.
 */
export const ANNOUNCEMENT_SETTLE_MS = 500;

/** Longest time to keep batching while new messages keep arriving. */
export const ANNOUNCEMENT_MAX_BATCH_MS = 2000;

const MIN_READING_TIME_MS = 1000;
/** Roughly 200 words per minute, a common default screen reader speech rate. */
const READING_TIME_PER_CHARACTER_MS = 60;

/**
 * Rough time screen readers need to read an announcement. Announcements are assertive and interrupt
 * whatever is being read, so the next announcement waits until the previous one is likely read.
 */
export const estimateReadingTimeMs = (messages: string[]): number =>
  Math.max(MIN_READING_TIME_MS, messages.join(' ').length * READING_TIME_PER_CHARACTER_MS);

const resolveMessages = (batch: AnnouncementMessage[]): string[] =>
  [
    ...new Set(
      batch.map((message) => (typeof message === 'function' ? message() : message).trim())
    ),
  ].filter(Boolean);

/**
 * Turns messages for screen readers into announcements:
 * - messages that arrive close together are announced as one, once none arrived for
 *   {@link ANNOUNCEMENT_SETTLE_MS}, or {@link ANNOUNCEMENT_MAX_BATCH_MS} after the first one;
 * - an announcement waits until the previous one is likely read.
 *
 * `messages$` must be hot (e.g. a `Subject`), because batching subscribes to it more than once.
 */
export const toAnnouncements = (
  messages$: Observable<AnnouncementMessage>
): Observable<Announcement> => {
  let lastId = 0;

  return messages$.pipe(
    exhaustMap((firstMessage) => {
      const batch$ = messages$.pipe(startWith(firstMessage));
      const batchEnd$ = race(
        batch$.pipe(debounceTime(ANNOUNCEMENT_SETTLE_MS)),
        timer(ANNOUNCEMENT_MAX_BATCH_MS)
      );
      return batch$.pipe(takeUntil(batchEnd$), toArray());
    }),
    // Messages are resolved here, so functions read content that has rendered by now
    concatMap((batch) => {
      const messages = resolveMessages(batch);
      if (!messages.length) {
        return EMPTY;
      }
      return concat(
        of({ id: ++lastId, messages }),
        timer(estimateReadingTimeMs(messages)).pipe(ignoreElements())
      );
    })
  );
};
