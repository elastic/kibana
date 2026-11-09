/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates one EDOT React Native session of one app on one device, starting at the
 * run's `from`. What happens after the run's `to` is cut off. Not meant for `--live`.
 *
 * Scenario options:
 * - platform (android | ios, default: android): a Pixel 8 or an iPhone 15 Pro
 * - health (healthy | slow | erroring | critical, default: healthy)
 * - screenViews (number, default: 4)
 * - visits (number, default: 1): times the user opens the app during the session
 * - withManualSpans (boolean, default: true): the app's own `app.launch` and screen spans
 * - seed (string or number, default: the run's `from` in milliseconds)
 *
 * Run:
 *   node scripts/synthtrace digital_experience_mobile_single_session --from=now-30m --to=now
 *   node scripts/synthtrace digital_experience_mobile_single_session --from=now-30m --to=now --scenarioOpts platform=ios,health=critical
 */

import {
  createSeededRandom,
  edotReactNative,
  type EdotReactNativeAppModel,
  type EdotReactNativeDocument,
  type HealthProfileName,
  type MobilePlatform,
} from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import {
  getDefaultSeed,
  getTimestamp,
  parseBooleanOption,
  parseSeed,
  randomUuid,
  SEED_LOG_HINT,
} from './helpers/digital_experience_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const API = 'https://api.example-notes.com';

const DEVICES = {
  android: edotReactNative.deviceProfiles.pixel8Android15,
  ios: edotReactNative.deviceProfiles.iphone15ProIos18,
} as const;

const MODEL: EdotReactNativeAppModel = {
  screens: [
    {
      name: 'Notes',
      iosTitle: 'Notes',
      requests: [{ method: 'GET', url: `${API}/api/notes` }],
      widgets: [{ id: 'note-row', name: 'Groceries' }],
    },
    {
      name: 'NoteDetail',
      iosTitle: 'Note',
      requests: [{ method: 'GET', url: `${API}/api/notes/42` }],
      widgets: [
        {
          id: 'save-note',
          name: 'Save',
          request: { method: 'PUT', url: `${API}/api/notes/42`, errorLog: 'Saving note failed' },
        },
      ],
    },
  ],
  errorLogs: ['Sync conflict'],
};

const parseOneOf = <T extends string>(key: string, value: unknown, allowed: readonly T[]): T => {
  const match = allowed.find((option) => option === String(value).trim().toLowerCase());
  if (!match) {
    throw new Error(`${key} must be one of ${allowed.join(', ')}`);
  }
  return match;
};

const parsePositiveInteger = (key: string, value: unknown): number => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${key} must be a positive integer`);
  }
  return number;
};

const scenario: Scenario<OtelDocument> = async ({ scenarioOpts = {}, logger, from }) => {
  const opts = {
    platform: parseOneOf<MobilePlatform>('platform', scenarioOpts.platform ?? 'android', [
      'android',
      'ios',
    ]),
    health: parseOneOf<HealthProfileName>('health', scenarioOpts.health ?? 'healthy', [
      'healthy',
      'slow',
      'erroring',
      'critical',
    ]),
    screenViews: parsePositiveInteger('screenViews', scenarioOpts.screenViews ?? 4),
    visits: parsePositiveInteger('visits', scenarioOpts.visits ?? 1),
    withManualSpans: parseBooleanOption('withManualSpans', scenarioOpts.withManualSpans, true),
    seed: parseSeed(scenarioOpts.seed, getDefaultSeed(from)),
  };
  logger.info(
    `Generating a single EDOT React Native session with ${JSON.stringify(opts)}; ${SEED_LOG_HINT}`
  );

  const random = createSeededRandom(`${opts.seed}:single-session`);
  const [installationId, sessionId, deviceId] = Array.from({ length: 3 }, () => randomUuid(random));
  const app = edotReactNative.app({
    serviceName: 'notes-mobile',
    serviceVersion: '1.2.0',
    appId: 'com.example.notes',
    buildNumber: 120,
    environment: ENVIRONMENT,
  });
  const events = edotReactNative.session({
    client: app.client(DEVICES[opts.platform], {
      installationId,
      sessionId,
      deviceId,
      network: { type: 'wifi' },
    }),
    app: MODEL,
    health: edotReactNative.healthProfiles[opts.health],
    screenViews: opts.screenViews,
    visits: opts.visits,
    manualSpans: opts.withManualSpans ? { launch: true, screens: true } : {},
    random,
    start: from,
  });

  const timedEvents = events.map((event) => ({ event, time: getTimestamp(event) }));

  return {
    // Synthtrace splits a run into ranges, one per worker, and evaluates the scenario in each, so
    // every interval emits only the events that happen in it
    generate: ({ range, clients: { otelEsClient } }) =>
      withClient(
        otelEsClient,
        range
          .interval('1m')
          .generator<EdotReactNativeDocument>((timestamp, _index, { stepMilliseconds }) => {
            const end = Math.min(timestamp + stepMilliseconds, range.to.getTime());
            return timedEvents
              .filter(({ time }) => time >= timestamp && time < end)
              .map(({ event }) => event);
          })
      ),
  };
};

export default scenario;
