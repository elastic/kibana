/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Observable,
  Subject,
  Subscription,
  connectable,
  debounceTime,
  exhaustMap,
  map,
  race,
  startWith,
  takeUntil,
  timer,
  toArray,
} from 'rxjs';
import type { ScreenReaderNotifyOptions } from '@kbn/core-notifications-browser';

export type Politeness = NonNullable<ScreenReaderNotifyOptions['politeness']>;

/**
 * A message to announce, or a function returning it. Functions are called when the message's batch
 * closes, which lets callers read content that renders after they notify, and return an empty
 * string to skip a message that's no longer relevant.
 */
export type AnnouncementMessage = string | (() => string);

export interface QueuedMessage {
  message: AnnouncementMessage;
  politeness: Politeness;
  key?: string;
}

export interface ResolvedMessage {
  text: string;
  politeness: Politeness;
  key?: string;
}

export interface Announcement {
  /** Unique per announcement, so that repeating the same messages is announced again. */
  id: number;
  messages: ResolvedMessage[];
}

/**
 * How long to wait after the latest message. Messages caused by the same action (e.g. a toast and a
 * page change) are announced together, and focus changes caused by that action (e.g. a closed flyout
 * returning focus) happen first, so an assertive announcement interrupts their readout instead of
 * the other way around.
 */
export const ANNOUNCEMENT_SETTLE_MS = 500;

/** Longest time to keep batching while new messages keep arriving. */
export const ANNOUNCEMENT_MAX_BATCH_MS = 2000;

const MIN_READING_TIME_MS = 1000;
/** Longer messages may be cut off by the next announcement, rather than holding up all others. */
export const MAX_READING_TIME_MS = 5000;
/** Roughly 200 words per minute, a common default screen reader speech rate. */
const READING_TIME_PER_CHARACTER_MS = 60;

/**
 * Rough time screen readers need to read an announcement. The next announcement waits for it, so
 * that an assertive message doesn't cut off the previous one.
 */
export const estimateReadingTimeMs = (messages: ResolvedMessage[]): number =>
  Math.min(
    MAX_READING_TIME_MS,
    Math.max(
      MIN_READING_TIME_MS,
      messages.map(({ text }) => text).join(' ').length * READING_TIME_PER_CHARACTER_MS
    )
  );

const resolveMessage = ({ message, politeness, key }: QueuedMessage): ResolvedMessage[] => {
  try {
    const text = (typeof message === 'function' ? message() : message).trim();
    return text ? [{ text, politeness, key }] : [];
  } catch {
    // Skipped, so that one failing message doesn't stop all later announcements
    return [];
  }
};

const resolveMessages = (batch: QueuedMessage[]): ResolvedMessage[] =>
  batch.flatMap(resolveMessage);

/**
 * Adds messages to the ones waiting to be announced. A message replaces a waiting message with the
 * same key, and identical messages are announced once.
 */
const addMessages = (waiting: ResolvedMessage[], added: ResolvedMessage[]): ResolvedMessage[] =>
  added.reduce(
    (messages, message) => [
      ...messages.filter(({ text, politeness, key }) =>
        message.key !== undefined
          ? key !== message.key
          : text !== message.text || politeness !== message.politeness
      ),
      message,
    ],
    waiting
  );

/**
 * Turns messages for screen readers into announcements:
 * - messages that arrive close together form a batch, which closes once none arrived for
 *   {@link ANNOUNCEMENT_SETTLE_MS}, or {@link ANNOUNCEMENT_MAX_BATCH_MS} after the first one;
 * - a closed batch is announced right away, unless the previous announcement is still being read.
 *   Batches that close meanwhile are merged into a single waiting announcement;
 * - a message with a key removes a waiting message with the same key as soon as it arrives, so the
 *   outdated one can't be announced while the new one's batch is still open.
 */
export const toAnnouncements = (messages$: Observable<QueuedMessage>): Observable<Announcement> =>
  new Observable<Announcement>((subscriber) => {
    // Shared by the subscriptions below, and only started once they're all subscribed
    const shared$ = connectable(messages$, { connector: () => new Subject<QueuedMessage>() });
    const subscription = new Subscription();
    // State of this subscriber's queue. It's plain state rather than part of a pipeline, because
    // closed batches, keyed messages and the reading timer all change it.
    let waiting: ResolvedMessage[] = [];
    let isReading = false;
    let lastId = 0;

    const announceWaiting = () => {
      if (isReading || !waiting.length) {
        return;
      }
      const messages = waiting;
      waiting = [];
      isReading = true;
      subscriber.next({ id: ++lastId, messages });
      subscription.add(
        timer(estimateReadingTimeMs(messages)).subscribe(() => {
          isReading = false;
          announceWaiting();
        })
      );
    };

    subscription.add(
      shared$.subscribe(({ key }) => {
        if (key !== undefined) {
          waiting = waiting.filter((message) => message.key !== key);
        }
      })
    );

    subscription.add(
      shared$
        .pipe(
          exhaustMap((firstMessage) => {
            const batch$ = shared$.pipe(startWith(firstMessage));
            const batchEnd$ = race(
              batch$.pipe(debounceTime(ANNOUNCEMENT_SETTLE_MS)),
              timer(ANNOUNCEMENT_MAX_BATCH_MS)
            );
            return batch$.pipe(takeUntil(batchEnd$), toArray());
          }),
          // Resolved when the batch closes rather than when it's announced, so that waiting for the
          // previous announcement doesn't skip toasts that expired in the meantime
          map(resolveMessages)
        )
        .subscribe((messages) => {
          waiting = addMessages(waiting, messages);
          announceWaiting();
        })
    );
    subscription.add(shared$.connect());

    return subscription;
  });
