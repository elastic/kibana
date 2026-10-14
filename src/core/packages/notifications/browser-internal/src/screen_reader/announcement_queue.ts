/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

/**
 * Collects messages for screen readers and decides when to announce them: in batches, and without
 * interrupting the previous announcement.
 */
export class AnnouncementQueue {
  private pending: Array<() => string> = [];
  private firstQueuedAt = 0;
  private lastQueuedAt = 0;
  private readingUntil = 0;
  private lastId = 0;
  private timeoutId?: ReturnType<typeof setTimeout>;

  constructor(private readonly onAnnounce: (announcement: Announcement) => void) {}

  public add(message: AnnouncementMessage) {
    const now = Date.now();
    if (!this.pending.length) {
      this.firstQueuedAt = now;
    }
    this.lastQueuedAt = now;
    this.pending.push(typeof message === 'string' ? () => message : message);
    this.scheduleCheck();
  }

  public stop() {
    clearTimeout(this.timeoutId);
    this.pending = [];
  }

  private getReadyAt(): number {
    const batchReadyAt = Math.min(
      this.lastQueuedAt + ANNOUNCEMENT_SETTLE_MS,
      this.firstQueuedAt + ANNOUNCEMENT_MAX_BATCH_MS
    );
    return Math.max(batchReadyAt, this.readingUntil);
  }

  private scheduleCheck(delayMs = this.getReadyAt() - Date.now()) {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(this.check, Math.max(0, delayMs));
  }

  private check = () => {
    const now = Date.now();

    if (now < this.getReadyAt()) {
      this.scheduleCheck();
      return;
    }

    this.announce(now);
  };

  private announce(now: number) {
    const messages = [...new Set(this.pending.map((getMessage) => getMessage().trim()))].filter(
      Boolean
    );
    this.pending = [];

    if (messages.length) {
      this.readingUntil = now + estimateReadingTimeMs(messages);
      this.onAnnounce({ id: ++this.lastId, messages });
    }
  }
}
