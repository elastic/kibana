/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { between, pick, randomHex } from '../../edot_shared/random';
import type { EdotBrowserClient } from '../edot_browser_client';
import type { EdotBrowserEvent, EdotBrowserSessionDocument } from '../edot_browser_session';
import {
  buildSegmentEvents,
  packEventJson,
  REPLAY_SIZES,
  RRWEB_EVENT_TYPE,
  splitIntoChunks,
  type ReplaySize,
} from './replay_events';
import type { ReplayPageName } from './replay_page_snapshots';

export { REPLAY_SIZES, type ReplaySize };

/** `replay.maxChunkBytes` of EDOT Browser: the largest body of a record, in bytes. */
export const DEFAULT_MAX_CHUNK_BYTES = 262_144;

/**
 * What the replay buffer keeps before an error, in milliseconds: error mode records from a
 * FullSnapshot taken shortly before the error, so the replay shows what led up to it.
 */
const ERROR_BUFFER_MS = 5_000;

/** A visit of a session: the tab it happened in and the documents it loaded. */
export interface EdotBrowserReplayVisit {
  /** The browser tab's client, with the session and tab IDs the records carry. */
  client: EdotBrowserClient;
  documents: readonly EdotBrowserSessionDocument[];
}

export interface EdotBrowserReplayOptions {
  /** The session's visits, in any order. */
  visits: readonly EdotBrowserReplayVisit[];
  /**
   * `sampled`: every page load records from its start. `error`: nothing records until the first
   * uncaught exception, which starts a segment, and the page loads after it record from their
   * start. A session without an exception has no replay.
   */
  trigger: 'sampled' | 'error';
  size: ReplaySize;
  /** Draws everything about the replay, apart from the session's own random. */
  random: () => number;
  /** Compresses the events with `@rrweb/packer`, as apps that set `packEvents` do. */
  packEvents?: boolean;
  /** Largest body of a record, in bytes. */
  maxChunkBytes?: number;
  /**
   * The first FullSnapshot of one segment loses a chunk on its way. The segment gets a second
   * FullSnapshot later on, where the player can pick it up. Needs `packEvents` to be off.
   */
  missingChunk?: boolean;
  /** Recording starts with the second page load, as when the recorder failed to load on the first. */
  startsAfterFirstPage?: boolean;
  /**
   * Leaves out the segments that start before this time: with their first events cut off, they
   * would have no FullSnapshot to play from, as when a window opens in the middle of a session.
   */
  notBefore?: number;
}

/** A shape of page for each path, so pages of the same kind look the same in every session. */
const PAGE_RULES: ReadonlyArray<readonly [pattern: RegExp, page: ReplayPageName]> = [
  [/checkout|cart|payment|\/new\b|password|account|login/i, 'checkout'],
  [/orders|tickets|api-reference|search/i, 'dataTable'],
  [/articles|video|guides|docs|kb\//i, 'article'],
  [/products|^\/$/i, 'shopList'],
];
const FALLBACK_PAGES: readonly ReplayPageName[] = ['shopList', 'article', 'dataTable', 'errorPage'];

const pageFor = (path: string): ReplayPageName => {
  const rule = PAGE_RULES.find(([pattern]) => pattern.test(path));
  if (rule) {
    return rule[1];
  }
  const hash = Array.from(path).reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) % 0x100000000,
    7
  );
  return FALLBACK_PAGES[hash % FALLBACK_PAGES.length];
};

const DESKTOP_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
] as const;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

/** A random v4 UUID, like the `crypto.randomUUID()` the recorder takes segment IDs from. */
const uuid = (random: () => number): string =>
  [
    randomHex(random, 8),
    randomHex(random, 4),
    `4${randomHex(random, 3)}`,
    `${pick(random, ['8', '9', 'a', 'b'])}${randomHex(random, 3)}`,
    randomHex(random, 12),
  ].join('-');

interface PlannedSegment {
  client: EdotBrowserClient;
  document: EdotBrowserSessionDocument;
  start: number;
  trigger: 'sampled' | 'error';
}

/** Where the session records, in time order: one segment for every page load that records. */
const planSegments = (
  visits: readonly EdotBrowserReplayVisit[],
  trigger: 'sampled' | 'error',
  startsAfterFirstPage: boolean
): PlannedSegment[] => {
  const documents = visits
    .flatMap(({ client, documents: visitDocuments }) =>
      visitDocuments.map((document) => ({ client, document }))
    )
    .sort((a, b) => a.document.start - b.document.start);

  if (trigger === 'sampled') {
    return documents
      .slice(startsAfterFirstPage ? 1 : 0)
      .map(({ client, document }) => ({ client, document, start: document.start, trigger }));
  }

  const firstError = documents.findIndex(({ document }) => document.exceptionTimes.length > 0);
  if (firstError === -1) {
    return [];
  }
  // The buffer begins up to a few seconds before the error, never before the page loaded
  const [errorTime] = [...documents[firstError].document.exceptionTimes].sort((a, b) => a - b);
  return documents.slice(firstError).map(({ client, document }, index) => ({
    client,
    document,
    start: index === 0 ? Math.max(document.start, errorTime - ERROR_BUFFER_MS) : document.start,
    trigger,
  }));
};

/**
 * The replay records of a session, in the wire format of EDOT Browser's session replay: a
 * segment for every page load that records, each with an `elastic.replay.start` record and one
 * `elastic.replay.event` record for every rrweb event, or for every chunk of one that is too
 * large for a record. Every segment starts at sequence 0 with a Meta and a FullSnapshot event.
 */
export const replaySession = ({
  visits,
  trigger,
  size,
  random,
  packEvents = false,
  maxChunkBytes = DEFAULT_MAX_CHUNK_BYTES,
  missingChunk = false,
  startsAfterFirstPage = false,
  notBefore = -Infinity,
}: EdotBrowserReplayOptions): EdotBrowserEvent[] => {
  const segments = planSegments(visits, trigger, startsAfterFirstPage).filter(
    ({ start }) => start >= notBefore
  );
  // The segment that loses a chunk is drawn from the ones that exist. Packed events deflate far
  // below the chunk size, so none of them is ever split.
  const brokenSegment =
    missingChunk && !packEvents && segments.length > 0
      ? Math.floor(random() * segments.length)
      : -1;
  const desktopViewport = pick(random, DESKTOP_VIEWPORTS);

  return segments.flatMap(({ client, document, start, trigger: segmentTrigger }, index) => {
    const { end } = document;
    const isBroken = index === brokenSegment;
    const segmentId = uuid(random);
    const viewport = client.isMobile ? MOBILE_VIEWPORT : desktopViewport;
    const rrwebEvents = buildSegmentEvents({
      page: pageFor(document.path),
      url: document.url,
      viewport,
      start,
      end,
      size,
      random,
      clickTimes: document.clickTimes.filter((time) => time > start),
      exceptionTimes: document.exceptionTimes.filter((time) => time >= start),
      // A chunk can only go missing from an event that was split
      minSnapshotBytes: isBroken ? maxChunkBytes * 2.5 : 0,
      checkoutAt: isBroken ? start + Math.max(Math.floor((end - start) / 2), 2_000) : undefined,
    });

    // The SDK flushes its batches every second
    const observedAt = (time: number) =>
      Math.min(time + Math.floor(between(random, 0, 1_000)), end);
    const records: EdotBrowserEvent[] = [
      client
        .replayStart({ segmentId, trigger: segmentTrigger })
        .observedAt(observedAt(start))
        .timestamp(start),
    ];

    let brokenChunkPending = isBroken;
    rrwebEvents.forEach(({ type, timestamp, json }, sequence) => {
      const body = packEvents ? packEventJson(json) : json;
      const chunks = splitIntoChunks(body, maxChunkBytes);
      const isSplit = chunks.length > 1;
      const dropped =
        brokenChunkPending && isSplit && type === RRWEB_EVENT_TYPE.FullSnapshot
          ? Math.floor(random() * chunks.length)
          : -1;
      brokenChunkPending = brokenChunkPending && dropped === -1;
      const observed = observedAt(timestamp);

      chunks.forEach((chunkBody, chunkIndex) => {
        if (chunkIndex === dropped) {
          return;
        }
        records.push(
          client
            .replayEvent({
              segmentId,
              sequence,
              eventType: type,
              body: chunkBody,
              chunk: isSplit ? { index: chunkIndex, count: chunks.length } : undefined,
              packed: packEvents,
            })
            .observedAt(observed)
            .timestamp(timestamp)
        );
      });
    });

    return records;
  });
};
