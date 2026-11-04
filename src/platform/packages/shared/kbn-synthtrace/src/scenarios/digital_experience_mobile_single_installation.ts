/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates EDOT React Native sessions of a single installation of a single app, so all
 * sessions share one `app.installation.id`, device and app version. The installation opens the
 * app every 90 minutes, so use a range of a few hours. Both SDKs keep a session until it has been
 * idle for 30 minutes, which a two-visit session or an iOS crash report can come close to, so
 * `scale` can lengthen the gap but not shorten it.
 *
 * The device is a Pixel 8 or an iPhone 15 Pro, picked by the seed; `platform` forces one.
 *
 * Scenario options: those of `digital_experience_mobile` (platform, withManualSpans, scale, seed).
 *
 * Run:
 *   node scripts/synthtrace digital_experience_mobile_single_installation --from=now-6h --to=now
 *   node scripts/synthtrace digital_experience_mobile_single_installation --from=now-6h --to=now --scenarioOpts platform=ios
 */

import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { SEED_LOG_HINT } from './helpers/digital_experience_apps';
import {
  generateEdotReactNativeSessions,
  MINUTES_BETWEEN_SESSIONS_OF_AN_INSTALLATION,
  parseDigitalExperienceMobileScenarioOpts,
  type DigitalExperienceMobileApp,
} from './helpers/digital_experience_mobile_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const API = 'https://api.example-notes.com';

const APP: DigitalExperienceMobileApp = {
  serviceName: 'notes-mobile',
  versions: [{ serviceVersion: '1.2.0', buildNumber: 120, share: 1 }],
  appId: 'com.example.notes',
  health: 'healthy',
  sessionsPerMinute: 1 / MINUTES_BETWEEN_SESSIONS_OF_AN_INSTALLATION,
  installations: 1,
  deviceWeights: {
    pixel8Android15: 1,
    galaxyS23Android14: 0,
    galaxyA14Android13: 0,
    iphone15ProIos18: 1,
    iphone12Ios17: 0,
    ipadAirIpados18: 0,
  },
  manualSpans: { launch: true, screens: true },
  model: {
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
  },
};

const scenario: Scenario<OtelDocument> = async ({ scenarioOpts, logger, from }) => {
  const parsedOpts = parseDigitalExperienceMobileScenarioOpts(scenarioOpts, from);
  // More sessions would follow each other within 30 minutes, which the SDKs make one session
  const opts = { ...parsedOpts, scale: Math.min(parsedOpts.scale, 1) };
  if (opts.scale < parsedOpts.scale) {
    logger.warning(
      `scale=${parsedOpts.scale} would open the app within 30 minutes of the last session; using scale=1`
    );
  }
  logger.info(
    `Generating EDOT React Native data of a single installation with ${JSON.stringify(
      opts
    )}; ${SEED_LOG_HINT}`
  );

  return {
    generate: ({ range, clients: { otelEsClient } }) =>
      withClient(
        otelEsClient,
        generateEdotReactNativeSessions(range, {
          ...opts,
          environment: ENVIRONMENT,
          from,
          apps: [APP],
        })
      ),
  };
};

export default scenario;
