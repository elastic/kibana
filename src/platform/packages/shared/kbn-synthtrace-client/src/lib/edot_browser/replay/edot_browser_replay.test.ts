/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inflateSync } from 'zlib';
import type { OtelLogDocument } from '../../otel_logs';
import { createSeededRandom } from '../../utils/seeded_random';
import {
  edotBrowser,
  type EdotBrowserEvent,
  type EdotBrowserReplayOptions,
  type EdotBrowserSessionDocument,
  type EdotBrowserSite,
  type HealthProfileName,
} from '..';
import { DEFAULT_MAX_CHUNK_BYTES } from './edot_browser_replay';
import { splitIntoChunks } from './replay_events';

const REPLAY_INDEX = 'logs-rum.replay.otel-default';
const END = new Date('2026-10-16T12:00:00.000Z').getTime();

const SITE: EdotBrowserSite = {
  origin: 'https://shop.example.com',
  resources: [],
  pages: [
    { path: '/' },
    { path: '/products' },
    { path: '/checkout/payment', clickTargets: [{ tagName: 'BUTTON', cssSelector: '#pay' }] },
    { path: '/articles/2026/10/story' },
  ],
  exceptions: [{ type: 'Error', message: 'boom', stacks: [[{ functionName: 'render' }]] }],
};

const app = edotBrowser.app({ serviceName: 'storefront-web', environment: 'production' });
const SESSION_ID = '6f1c2e7a-0d3b-4c55-9a8e-2b7f9e0c1d34';
const TAB_ID = 'b2e4d7c1-5a6f-4e3b-8c9d-0a1b2c3d4e5f';

interface SimulatedSession {
  visits: EdotBrowserReplayOptions['visits'];
  documents: EdotBrowserSessionDocument[];
  events: EdotBrowserEvent[];
}

const simulate = (
  seed: number,
  {
    pageViews = 4,
    health = 'critical',
    hardNavigationRate = 1,
  }: { pageViews?: number; health?: HealthProfileName; hardNavigationRate?: number } = {}
): SimulatedSession => {
  const random = createSeededRandom(`replay-test:${seed}`);
  const client = app.client(edotBrowser.browserProfiles.chromeMacos, {
    sessionId: SESSION_ID,
    tabId: TAB_ID,
  });
  const { events, documents } = edotBrowser.sessionWithDocuments({
    client,
    site: SITE,
    health: edotBrowser.healthProfiles[health],
    random,
    pageViews,
    hardNavigationRate,
    end: END,
  });
  return { visits: [{ client, documents }], documents, events };
};

const replay = (
  session: SimulatedSession,
  options: Partial<EdotBrowserReplayOptions> = {},
  seed: number = 1
) =>
  edotBrowser
    .replaySession({
      visits: session.visits,
      trigger: 'sampled',
      size: 'typical',
      random: createSeededRandom(`replay-test-content:${seed}`),
      ...options,
    })
    .map((event) => event.serialize()[0] as OtelLogDocument);

const attribute = (doc: OtelLogDocument, name: string) => doc.attributes?.[name];

interface RrwebNode {
  id: number;
  childNodes?: RrwebNode[];
}

interface RrwebEvent {
  type: number;
  timestamp: number;
  /** The mark `@rrweb/packer` writes. */
  v?: string;
  data: {
    href?: string;
    node?: RrwebNode;
    source?: number;
    type?: number;
    id?: number;
    positions?: Array<{ id: number }>;
    adds?: Array<{ parentId: number; node: RrwebNode }>;
  };
}

interface ReassembledEvent {
  sequence: number;
  eventType: number;
  /** Unset when a chunk is missing. */
  event?: RrwebEvent;
}

interface ReassembledSegment {
  segmentId: string;
  start: OtelLogDocument;
  events: ReassembledEvent[];
}

/**
 * Reassembles the segments of replay records the way the design says a player does: group by
 * segment and sequence, check that all chunks are there, concatenate them in order, unpack when
 * packed and parse.
 */
const reassemble = (docs: OtelLogDocument[]): ReassembledSegment[] => {
  const segments = new Map<string, ReassembledSegment>();
  const pieces = new Map<string, OtelLogDocument[]>();
  docs.forEach((doc) => {
    const segmentId = attribute(doc, 'elastic.replay.segment.id') as string;
    if (doc.event_name === 'elastic.replay.start') {
      segments.set(segmentId, { segmentId, start: doc, events: [] });
      return;
    }
    const key = `${segmentId}:${attribute(doc, 'elastic.replay.sequence')}`;
    pieces.set(key, [...(pieces.get(key) ?? []), doc]);
  });

  pieces.forEach((records, key) => {
    const [segmentId, sequence] = key.split(':');
    const count = (attribute(records[0], 'elastic.replay.chunk.count') as number | undefined) ?? 1;
    const ordered = [...records].sort(
      (a, b) =>
        ((attribute(a, 'elastic.replay.chunk.index') as number | undefined) ?? 0) -
        ((attribute(b, 'elastic.replay.chunk.index') as number | undefined) ?? 0)
    );
    const complete =
      ordered.length === count &&
      ordered.every(
        (record, index) =>
          ((attribute(record, 'elastic.replay.chunk.index') as number | undefined) ?? 0) === index
      );
    const eventType = attribute(records[0], 'elastic.replay.event.type') as number;
    let event: ReassembledEvent['event'];
    if (complete) {
      const body = ordered.map((record) => record.body?.text).join('');
      event =
        attribute(records[0], 'elastic.replay.packed') === true
          ? JSON.parse(inflateSync(Buffer.from(body, 'latin1')).toString('utf8'))
          : JSON.parse(body);
    }
    segments.get(segmentId)?.events.push({ sequence: Number(sequence), eventType, event });
  });

  segments.forEach((segment) => segment.events.sort((a, b) => a.sequence - b.sequence));
  return [...segments.values()];
};

const collectNodeIds = (node: RrwebNode, ids: Set<number>) => {
  ids.add(node.id);
  node.childNodes?.forEach((child) => collectNodeIds(child, ids));
};

describe('edotBrowser.replaySession', () => {
  describe('wire format', () => {
    const session = simulate(1);
    const docs = replay(session);

    it('writes to the replay data stream, with the scope of the replay logger', () => {
      expect(docs.length).toBeGreaterThan(0);
      docs.forEach((doc) => {
        expect(doc._index).toBe(REPLAY_INDEX);
        expect(doc.scope).toEqual({
          name: '@elastic/opentelemetry-browser/replay',
          version: '0.4.0',
        });
        expect(['elastic.replay.event', 'elastic.replay.start']).toContain(doc.event_name);
        // The replay logger sets no severity
        expect(doc.severity_number).toBeUndefined();
      });
    });

    it('carries the session and tab of the session and the resource of the app', () => {
      docs.forEach((doc) => {
        expect(attribute(doc, 'session.id')).toBe(SESSION_ID);
        expect(attribute(doc, 'browser.tab.id')).toBe(TAB_ID);
        expect(doc.resource?.attributes?.['service.name']).toBe('storefront-web');
        expect(typeof attribute(doc, 'elastic.replay.segment.id')).toBe('string');
      });
    });

    it('writes one start record for every segment, with its trigger and format', () => {
      const starts = docs.filter(({ event_name: name }) => name === 'elastic.replay.start');
      expect(starts).toHaveLength(session.documents.length);
      starts.forEach((start) => {
        expect(attribute(start, 'elastic.replay.trigger')).toBe('sampled');
        expect(attribute(start, 'elastic.replay.format')).toBe('rrweb/2');
        expect(start.body).toBeUndefined();
      });
    });

    it('writes the sequence and the rrweb type as integers, and chunk attributes only when split', () => {
      docs
        .filter(({ event_name: name }) => name === 'elastic.replay.event')
        .forEach((doc) => {
          expect(Number.isInteger(attribute(doc, 'elastic.replay.sequence'))).toBe(true);
          expect(Number.isInteger(attribute(doc, 'elastic.replay.event.type'))).toBe(true);
          expect(typeof doc.body?.text).toBe('string');
          const split = attribute(doc, 'elastic.replay.chunk.count') !== undefined;
          expect(attribute(doc, 'elastic.replay.chunk.index') !== undefined).toBe(split);
          expect(attribute(doc, 'elastic.replay.packed')).toBeUndefined();
        });
    });
  });

  describe('segments', () => {
    const session = simulate(2);
    const segments = reassemble(replay(session));

    it('has a segment for every page load, within the page load', () => {
      expect(segments).toHaveLength(session.documents.length);
      segments.forEach((segment, index) => {
        const { start, end } = session.documents[index];
        expect(segment.events.length).toBeGreaterThan(2);
        segment.events.forEach(({ event }) => {
          expect(event!.timestamp).toBeGreaterThanOrEqual(start);
          expect(event!.timestamp).toBeLessThanOrEqual(end);
        });
      });
    });

    it('numbers events from 0 with a Meta and a FullSnapshot first, in time order', () => {
      segments.forEach(({ events, start }) => {
        expect(events.map(({ sequence }) => sequence)).toEqual(events.map((_, i) => i));
        expect(events.slice(0, 2).map(({ eventType }) => eventType)).toEqual([4, 2]);
        expect(events[0].event?.data.href).toMatch(/^https:\/\/shop\.example\.com\//);
        const times = events.map(({ event }) => event!.timestamp);
        expect(times).toEqual([...times].sort((a, b) => a - b));
        // The start record is at the segment's first event
        expect(Number(start['@timestamp'])).toBe(times[0]);
      });
    });

    it('reassembles every event, and the rrweb type is the one of the attribute', () => {
      segments.forEach(({ events }) =>
        events.forEach(({ event, eventType }) => {
          expect(event).toBeDefined();
          expect(event!.type).toBe(eventType);
        })
      );
    });

    it('uses ids of the snapshot, so the recording plays', () => {
      segments.forEach(({ events }) => {
        const ids = new Set<number>();
        collectNodeIds(events[1].event?.data.node ?? { id: -1 }, ids);
        events.slice(2).forEach(({ event }) => {
          const { data } = event!;
          if (event!.type !== 3) {
            return;
          }
          if (data.source === 1) {
            (data.positions ?? []).forEach(({ id }) => expect(ids.has(id)).toBe(true));
          }
          if (data.source === 2) {
            expect(ids.has(data.id ?? -1)).toBe(true);
          }
          if (data.source === 0) {
            (data.adds ?? []).forEach(({ parentId, node }) => {
              expect(ids.has(parentId)).toBe(true);
              expect(ids.has(node.id)).toBe(false);
            });
          }
        });
      });
    });

    it('records the clicks of the session when they happen', () => {
      const clickTimes = session.documents.flatMap((document) => document.clickTimes);
      expect(clickTimes.length).toBeGreaterThan(0);
      const recordedClicks = segments.flatMap(({ events }) =>
        events
          .filter(
            ({ event }) => event!.type === 3 && event!.data.source === 2 && event!.data.type === 0
          )
          .map(({ event }) => event!.timestamp - 1)
      );
      clickTimes.forEach((time) => expect(recordedClicks).toContain(time));
    });

    it('is the same for the same random source', () => {
      expect(replay(session, {}, 5)).toEqual(replay(session, {}, 5));
      expect(replay(session, {}, 5)).not.toEqual(replay(session, {}, 6));
    });
  });

  describe('chunks', () => {
    it('splits events over the chunk size in pieces of at most that many bytes', () => {
      const docs = replay(simulate(3), { size: 'heavy' });
      const split = docs.filter(
        (doc) => attribute(doc, 'elastic.replay.chunk.count') !== undefined
      );
      expect(split.length).toBeGreaterThan(0);
      split.forEach((doc) => {
        expect(Buffer.byteLength(doc.body!.text!)).toBeLessThanOrEqual(DEFAULT_MAX_CHUNK_BYTES);
        expect(attribute(doc, 'elastic.replay.chunk.count') as number).toBeGreaterThan(1);
        expect(attribute(doc, 'elastic.replay.chunk.count') as number).toBeLessThanOrEqual(256);
        // All chunks of a split event are FullSnapshots here, the only events this big
        expect(attribute(doc, 'elastic.replay.event.type')).toBe(2);
      });
      reassemble(docs).forEach(({ events }) =>
        events.forEach(({ event }) => expect(event).toBeDefined())
      );
    });

    it('splits at the given size, and never inside a character', () => {
      const body = 'aé€😀'.repeat(50);
      const chunks = splitIntoChunks(body, 7);
      expect(chunks.join('')).toBe(body);
      chunks.forEach((chunk) => {
        expect(Buffer.byteLength(chunk)).toBeLessThanOrEqual(7);
        expect(chunk).not.toContain('�');
      });
      expect(splitIntoChunks('short', 100)).toEqual(['short']);
    });
  });

  describe('packed events', () => {
    it('marks every record packed and unpacks to the rrweb events with the packer mark', () => {
      const docs = replay(simulate(4), { packEvents: true });
      docs
        .filter(({ event_name: name }) => name === 'elastic.replay.event')
        .forEach((doc) => expect(attribute(doc, 'elastic.replay.packed')).toBe(true));
      const segments = reassemble(docs);
      expect(segments.length).toBeGreaterThan(0);
      segments.forEach(({ events }) =>
        events.forEach(({ event, eventType }) => {
          expect(event!.v).toBe('v1');
          expect(event!.type).toBe(eventType);
        })
      );
    });
  });

  describe('error mode', () => {
    it('has no replay for a session without an uncaught exception', () => {
      const session = simulate(5, { health: 'healthy', pageViews: 1 });
      const hasException = session.documents.some(({ exceptionTimes }) => exceptionTimes.length);
      expect(hasException).toBe(false);
      expect(replay(session, { trigger: 'error' })).toEqual([]);
    });

    it('starts recording shortly before the first exception, and from the page load after it', () => {
      const session = Array.from({ length: 60 }, (_, seed) =>
        simulate(seed, { pageViews: 6 })
      ).find(
        ({ documents }) =>
          documents.length >= 3 &&
          documents.findIndex(({ exceptionTimes }) => exceptionTimes.length > 0) === 1
      )!;
      expect(session).toBeDefined();
      const segments = reassemble(replay(session, { trigger: 'error' }));
      const [, errored, ...later] = session.documents;
      const [errorTime] = [...errored.exceptionTimes].sort((a, b) => a - b);

      // The page before the first exception isn't recorded
      expect(segments).toHaveLength(session.documents.length - 1);
      const [first, ...rest] = segments;
      const firstStart = first.events[0].event!.timestamp;
      expect(firstStart).toBeLessThanOrEqual(errorTime);
      expect(firstStart).toBeGreaterThanOrEqual(Math.max(errored.start, errorTime - 5_000));
      expect(attribute(first.start, 'elastic.replay.trigger')).toBe('error');
      expect(first.events.some(({ eventType }) => eventType === 6)).toBe(true);
      rest.forEach((segment, index) => {
        expect(segment.events[0].event!.timestamp).toBe(later[index].start);
        expect(attribute(segment.start, 'elastic.replay.trigger')).toBe('error');
      });
    });
  });

  describe('edge cases', () => {
    it('loses a chunk of the first FullSnapshot of one segment, which has a later one to carry on from', () => {
      const session = simulate(6, { pageViews: 5 });
      const segments = reassemble(replay(session, { missingChunk: true }));
      const broken = segments.filter(({ events }) => events.some(({ event }) => !event));
      expect(broken).toHaveLength(1);
      const [{ events }] = broken;
      expect(events.filter(({ event }) => !event)).toHaveLength(1);
      const [meta, snapshot] = events;
      expect(meta.event).toBeDefined();
      expect(snapshot.eventType).toBe(2);
      expect(snapshot.event).toBeUndefined();
      expect(
        events.filter(({ eventType, event }) => eventType === 2 && event).length
      ).toBeGreaterThan(0);
      segments
        .filter((segment) => !broken.includes(segment))
        .forEach((segment) => segment.events.forEach(({ event }) => expect(event).toBeDefined()));
    });

    it('starts recording with the second page load', () => {
      const session = simulate(7, { pageViews: 4 });
      expect(session.documents.length).toBeGreaterThan(1);
      const segments = reassemble(replay(session, { startsAfterFirstPage: true }));
      expect(segments).toHaveLength(session.documents.length - 1);
      expect(segments[0].events[0].event!.timestamp).toBe(session.documents[1].start);
    });

    it('leaves out the segments that start before the given time', () => {
      const session = simulate(8, { pageViews: 4 });
      const { start } = session.documents[1];
      const segments = reassemble(replay(session, { notBefore: start }));
      expect(segments).toHaveLength(session.documents.length - 1);
      expect(segments[0].events[0].event!.timestamp).toBe(start);
    });
  });

  describe('size', () => {
    const averageKilobytes = (size: 'light' | 'typical' | 'heavy', sessions: number) => {
      const total = Array.from({ length: sessions }, (_, seed) =>
        replay(
          simulate(100 + seed, { health: 'healthy', pageViews: 3, hardNavigationRate: 0.2 }),
          { size },
          seed
        ).reduce((sum, doc) => sum + Buffer.byteLength(doc.body?.text ?? ''), 0)
      ).reduce((sum, bytes) => sum + bytes, 0);
      return total / sessions / 1024;
    };

    it('is close to the measured sizes of a session', () => {
      // About 50 KB, 0.5 MB and 4 to 5 MB, for sessions with a page load or two (a new document for one page view in five)
      expect(averageKilobytes('light', 30)).toBeGreaterThan(20);
      expect(averageKilobytes('light', 30)).toBeLessThan(120);
      expect(averageKilobytes('typical', 30)).toBeGreaterThan(250);
      expect(averageKilobytes('typical', 30)).toBeLessThan(900);
      expect(averageKilobytes('heavy', 12)).toBeGreaterThan(2_500);
      expect(averageKilobytes('heavy', 12)).toBeLessThan(8_000);
    });
  });
});
