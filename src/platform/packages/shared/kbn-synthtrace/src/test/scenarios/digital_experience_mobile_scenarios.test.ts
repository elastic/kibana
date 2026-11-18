/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import { timerange, type Timerange } from '@kbn/synthtrace-client';
import type { Scenario, ScenarioInitOptions } from '../../cli/scenario';
import type { SynthtraceClients } from '../../cli/utils/clients_manager';
import { createLogger, LogLevel } from '../../lib/utils/create_logger';
import type { OtelDocument } from '../../lib/otel/otel_synthtrace_es_client';
import type { SynthGenerator } from '../../lib/utils/with_client';
import singleInstallation from '../../scenarios/digital_experience_mobile_single_installation';
import singleSession from '../../scenarios/digital_experience_mobile_single_session';

const MINUTE_MS = 60_000;
const logger = createLogger(LogLevel.error);
// generate only hands the clients over with the generators
const clients = { otelEsClient: {} } as SynthtraceClients;

/** The documents a scenario generates for `range`, evaluated with the run's `from` and `to`. */
const run = async (
  scenario: Scenario<OtelDocument>,
  {
    scenarioOpts,
    from,
    to,
    range = timerange(from, to, logger),
  }: { scenarioOpts: Record<string, unknown>; from: number; to: number; range?: Timerange }
): Promise<OtelDocument[]> => {
  const { generate } = await scenario({ scenarioOpts, logger, from, to } as ScenarioInitOptions);
  const generatorsOf = (generator: SynthGenerator<OtelDocument>) => {
    if (generator instanceof Readable) {
      throw new Error('Expected synthtrace generators');
    }
    return Array.isArray(generator) ? generator : [generator];
  };
  return [generate({ range, clients })]
    .flat()
    .flatMap(({ generator }) => generatorsOf(generator))
    .flatMap((generator) => Array.from(generator).flatMap((event) => event.serialize()));
};

/** When each session starts and ends, in the order they start. */
const sessionsOf = (docs: OtelDocument[]) => {
  const sessions = new Map<string, { start: number; end: number }>();
  // Span events have no session.id
  docs.forEach((doc) => {
    const sessionId = doc.attributes?.['session.id'];
    if (sessionId === undefined) {
      return;
    }
    const time = Number(doc['@timestamp']);
    const end = time + ('kind' in doc ? (doc.duration ?? 0) / 1_000_000 : 0);
    const session = sessions.get(String(sessionId)) ?? { start: time, end };
    sessions.set(String(sessionId), {
      start: Math.min(session.start, time),
      end: Math.max(session.end, end),
    });
  });
  return [...sessions.values()].sort((a, b) => a.start - b.start);
};

describe('digital experience mobile scenarios', () => {
  describe('digital_experience_mobile_single_installation', () => {
    const from = new Date('2026-10-16T00:00:00.000Z').getTime();
    const to = from + 24 * 60 * MINUTE_MS;

    it('keeps the sessions of the installation more than 30 minutes apart, whatever the scale', async () => {
      for (const scenarioOpts of [
        { seed: 'single-installation' },
        { seed: 'single-installation', platform: 'ios' },
        { seed: 'single-installation', scale: 4 },
      ]) {
        const sessions = sessionsOf(await run(singleInstallation, { scenarioOpts, from, to }));
        expect(sessions.length).toBeGreaterThan(10);
        sessions.slice(1).forEach(({ start }, i) => {
          expect(start - sessions[i].end).toBeGreaterThan(30 * MINUTE_MS);
        });
      }
    });
  });

  describe('digital_experience_mobile_single_session', () => {
    const from = new Date('2026-10-16T12:00:00.000Z').getTime();
    const to = from + 30 * MINUTE_MS;

    it('indexes the session once when the run is split among workers', async () => {
      const scenarioOpts = { platform: 'ios', health: 'critical', visits: 2, screenViews: 6 };
      const unsplit = await run(singleSession, { scenarioOpts, from, to });
      // Like a historical run with 10 workers, each evaluating the scenario with the run's from/to
      const bounds = Array.from({ length: 11 }, (_, i) => from + i * 3 * MINUTE_MS);
      const split = (
        await Promise.all(
          bounds.slice(1).map((end, i) =>
            run(singleSession, {
              scenarioOpts,
              from,
              to,
              range: timerange(bounds[i], end, logger),
            })
          )
        )
      ).flat();

      expect(unsplit.length).toBeGreaterThan(0);
      const sortKey = (doc: OtelDocument) => JSON.stringify(doc);
      expect(split.map(sortKey).sort()).toEqual(unsplit.map(sortKey).sort());
      const spanIds = unsplit.filter((doc) => 'kind' in doc).map((doc) => doc.span_id);
      expect(new Set(spanIds).size).toBe(spanIds.length);
      unsplit.forEach((doc) => {
        expect(Number(doc['@timestamp'])).toBeGreaterThanOrEqual(from);
        expect(Number(doc['@timestamp'])).toBeLessThan(to);
      });
    });
  });
});
