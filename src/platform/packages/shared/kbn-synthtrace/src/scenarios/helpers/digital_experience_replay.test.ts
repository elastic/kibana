/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timerange, type EdotBrowserDocument, type ReplaySize } from '@kbn/synthtrace-client';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  generateEdotBrowserSessions,
  parseDigitalExperienceScenarioOpts,
  type DigitalExperienceScenarioOpts,
} from './digital_experience_apps';

const REPLAY_INDEX = 'logs-rum.replay.otel-default';
const range = timerange(
  new Date('2026-10-16T12:00:00.000Z'),
  new Date('2026-10-16T12:10:00.000Z'),
  {} as ToolingLog
);
const FROM = range.from.getTime();
const TO = range.to.getTime();

// Visits that began before the range are cut off at `from`: a window this wide keeps them whole
const WIDE_FROM = FROM - 4 * 3_600_000;

const generate = (
  opts: Partial<DigitalExperienceScenarioOpts> = {},
  { from = FROM }: { from?: number } = {}
) =>
  generateEdotBrowserSessions(range, {
    environment: 'test',
    from,
    withSessionId: true,
    includeRawAttribution: false,
    environments: false,
    edgeCases: false,
    replayRate: 0,
    errorReplayRate: 0,
    replaySize: 'light' as ReplaySize,
    scale: 1,
    seed: 'digital-experience-replay-test',
    ...opts,
  }).flatMap((generator) =>
    Array.from(generator).flatMap((event): EdotBrowserDocument[] => event.serialize())
  );

const isReplay = (doc: EdotBrowserDocument) => doc._index === REPLAY_INDEX;
const attribute = (doc: EdotBrowserDocument, key: string) => doc.attributes?.[key];
const eventNameOf = (doc: EdotBrowserDocument) =>
  'event_name' in doc ? doc.event_name : undefined;
const sessionIdOf = (doc: EdotBrowserDocument) => attribute(doc, 'session.id') as string;

interface Segment {
  start: EdotBrowserDocument;
  /** sequence -> its chunks */
  events: Map<number, EdotBrowserDocument[]>;
}

const segmentsOf = (docs: EdotBrowserDocument[]): Map<string, Segment> => {
  const segments = new Map<string, Segment>();
  const segmentOf = (doc: EdotBrowserDocument) =>
    attribute(doc, 'elastic.replay.segment.id') as string;
  docs
    .filter((doc) => eventNameOf(doc) === 'elastic.replay.start')
    .forEach((start) => segments.set(segmentOf(start), { start, events: new Map() }));
  docs
    .filter((doc) => eventNameOf(doc) === 'elastic.replay.event')
    .forEach((doc) => {
      const { events } = segments.get(segmentOf(doc))!;
      const sequence = attribute(doc, 'elastic.replay.sequence') as number;
      events.set(sequence, [...(events.get(sequence) ?? []), doc]);
    });
  return segments;
};

const isComplete = (chunks: EdotBrowserDocument[]) => {
  const count = (attribute(chunks[0], 'elastic.replay.chunk.count') as number | undefined) ?? 1;
  const indexes = chunks
    .map((chunk) => (attribute(chunk, 'elastic.replay.chunk.index') as number | undefined) ?? 0)
    .sort((a, b) => a - b);
  return indexes.length === count && indexes.every((index, i) => index === i);
};

describe('digital experience session replay', () => {
  describe('parseDigitalExperienceScenarioOpts', () => {
    it('has no replay by default, and typical sessions when it is on', () => {
      expect(parseDigitalExperienceScenarioOpts(undefined, FROM)).toEqual(
        expect.objectContaining({ replayRate: 0, errorReplayRate: 0, replaySize: 'typical' })
      );
    });

    it('accepts rates and sizes, as typed values or CLI strings', () => {
      expect(
        parseDigitalExperienceScenarioOpts(
          { replayRate: 0.3, errorReplayRate: 1, replaySize: 'heavy' },
          FROM
        )
      ).toEqual(
        expect.objectContaining({ replayRate: 0.3, errorReplayRate: 1, replaySize: 'heavy' })
      );
      expect(
        parseDigitalExperienceScenarioOpts(
          { replayRate: '0.3', errorReplayRate: '0', replaySize: 'light' },
          FROM
        )
      ).toEqual(
        expect.objectContaining({ replayRate: 0.3, errorReplayRate: 0, replaySize: 'light' })
      );
    });

    it('rejects rates outside 0 to 1 and unknown sizes', () => {
      [-0.1, 1.5, 'abc', '', NaN, true].forEach((replayRate) => {
        expect(() => parseDigitalExperienceScenarioOpts({ replayRate }, FROM)).toThrow(
          'replayRate must be a number from 0 to 1'
        );
      });
      expect(() => parseDigitalExperienceScenarioOpts({ errorReplayRate: 2 }, FROM)).toThrow(
        'errorReplayRate must be a number from 0 to 1'
      );
      expect(() => parseDigitalExperienceScenarioOpts({ replaySize: 'huge' }, FROM)).toThrow(
        'replaySize must be one of light, typical, heavy'
      );
    });
  });

  describe('generateEdotBrowserSessions', () => {
    const withoutReplay = generate();
    const withReplay = generate({ replayRate: 0.3 });
    const replayDocs = withReplay.filter(isReplay);

    it('writes no replay unless a rate is set', () => {
      expect(withoutReplay.some(isReplay)).toBe(false);
      expect(replayDocs.length).toBeGreaterThan(0);
    });

    it('leaves the rest of the data as it is', () => {
      expect(withReplay.filter((doc) => !isReplay(doc))).toEqual(withoutReplay);
    });

    it('records about the share of sessions asked for, and only sessions of the data', () => {
      const docs = generate({ replayRate: 0.3 }, { from: WIDE_FROM });
      const sessions = new Set(
        docs
          .filter((doc) => !isReplay(doc))
          .map(sessionIdOf)
          .filter(Boolean)
      );
      const recorded = new Set(docs.filter(isReplay).map(sessionIdOf));
      expect(sessions.size).toBeGreaterThan(150);
      [...recorded].forEach((sessionId) => expect(sessions.has(sessionId)).toBe(true));
      expect(recorded.size / sessions.size).toBeGreaterThan(0.2);
      expect(recorded.size / sessions.size).toBeLessThan(0.4);
    });

    it('records every session at a rate of 1, the ones that expired included', () => {
      const docs = generate({ replayRate: 1 }, { from: WIDE_FROM });
      const sessions = new Set(
        docs
          .filter((doc) => !isReplay(doc))
          .map(sessionIdOf)
          .filter(Boolean)
      );
      expect(new Set(docs.filter(isReplay).map(sessionIdOf))).toEqual(sessions);
    });

    it('writes replay records that pass the reassembly rules', () => {
      const segments = segmentsOf(replayDocs);
      expect(segments.size).toBeGreaterThan(50);
      segments.forEach(({ start, events }) => {
        expect(attribute(start, 'elastic.replay.trigger')).toBe('sampled');
        const sequences = [...events.keys()].sort((a, b) => a - b);
        // No gaps, starting at 0 with a Meta and a FullSnapshot
        expect(sequences).toEqual(sequences.map((_, i) => i));
        expect(attribute(events.get(0)![0], 'elastic.replay.event.type')).toBe(4);
        expect(attribute(events.get(1)![0], 'elastic.replay.event.type')).toBe(2);
        events.forEach((chunks) => expect(isComplete(chunks)).toBe(true));
      });
      // Within the run, and with the session and tab of the session's other signals
      replayDocs.forEach((doc) => {
        expect(Number(doc['@timestamp'])).toBeGreaterThanOrEqual(FROM);
        expect(Number(doc['@timestamp'])).toBeLessThanOrEqual(TO);
        expect(attribute(doc, 'browser.tab.id')).toEqual(expect.any(String));
      });
      const tabsBySession = new Map<string, Set<unknown>>();
      withReplay
        .filter((doc) => !isReplay(doc) && sessionIdOf(doc))
        .forEach((doc) =>
          tabsBySession.set(
            sessionIdOf(doc),
            (tabsBySession.get(sessionIdOf(doc)) ?? new Set()).add(attribute(doc, 'browser.tab.id'))
          )
        );
      replayDocs.forEach((doc) =>
        expect(tabsBySession.get(sessionIdOf(doc))?.has(attribute(doc, 'browser.tab.id'))).toBe(
          true
        )
      );
    });

    it('is the same for the same seed', () => {
      expect(generate({ replayRate: 0.3 })).toEqual(withReplay);
    });

    it('writes no replay without session IDs, which the records carry', () => {
      expect(generate({ replayRate: 1, withSessionId: false }).some(isReplay)).toBe(false);
    });

    it('starts recording at the first exception with errorReplayRate', () => {
      const docs = generate({ errorReplayRate: 1 }, { from: WIDE_FROM });
      const errorDocs = docs.filter(isReplay);
      const sessionsWithErrors = new Set(
        docs.filter((doc) => eventNameOf(doc) === 'exception').map(sessionIdOf)
      );
      expect(errorDocs.length).toBeGreaterThan(0);
      errorDocs.forEach((doc) => expect(sessionsWithErrors.has(sessionIdOf(doc))).toBe(true));
      segmentsOf(errorDocs).forEach(({ start }) =>
        expect(attribute(start, 'elastic.replay.trigger')).toBe('error')
      );
      // Sessions without an exception have nothing, so there are fewer than with replayRate 1
      expect(new Set(errorDocs.map(sessionIdOf)).size).toBeLessThanOrEqual(sessionsWithErrors.size);
    });

    it('records sessions of the share left by replayRate with errorReplayRate', () => {
      const docs = generate({ replayRate: 0.5, errorReplayRate: 1 }).filter(isReplay);
      const triggers = new Set(
        [...segmentsOf(docs).values()].map(({ start }) =>
          attribute(start, 'elastic.replay.trigger')
        )
      );
      expect(triggers).toEqual(new Set(['sampled', 'error']));
    });

    describe('edge cases', () => {
      const replayOf = (edgeCases: boolean) => generate({ replayRate: 1, edgeCases });
      const incompleteSegments = (docs: EdotBrowserDocument[]) =>
        [...segmentsOf(docs.filter(isReplay)).values()].filter(({ events }) =>
          [...events.values()].some((chunks) => !isComplete(chunks))
        );
      // Page loads that don't record: sessions with fewer segments than page loads
      const pagesWithoutReplay = (docs: EdotBrowserDocument[]) => {
        const pageLoads = new Map<string, number>();
        docs
          .filter((doc) => eventNameOf(doc) === 'browser.navigation_timing')
          .forEach((doc) =>
            pageLoads.set(sessionIdOf(doc), (pageLoads.get(sessionIdOf(doc)) ?? 0) + 1)
          );
        const recorded = new Map<string, number>();
        segmentsOf(docs.filter(isReplay)).forEach(({ start }) =>
          recorded.set(sessionIdOf(start), (recorded.get(sessionIdOf(start)) ?? 0) + 1)
        );
        return [...recorded].reduce(
          (sum, [sessionId, count]) => sum + Math.max((pageLoads.get(sessionId) ?? 0) - count, 0),
          0
        );
      };

      it('has segments that lost a chunk only with the switch', () => {
        expect(incompleteSegments(replayOf(false))).toHaveLength(0);
        expect(incompleteSegments(replayOf(true)).length).toBeGreaterThan(0);
      });

      it('has sessions that start recording after their first page only with the switch', () => {
        expect(pagesWithoutReplay(replayOf(true))).toBeGreaterThan(
          pagesWithoutReplay(replayOf(false))
        );
      });
    });
  });
});
