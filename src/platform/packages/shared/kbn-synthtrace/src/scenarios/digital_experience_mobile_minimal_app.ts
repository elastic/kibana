/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates EDOT React Native sessions of the simplest app possible, with one version,
 * one screen that fires one request, no widgets and no spans of its own, so the data holds only
 * what the SDKs record by themselves. One session per minute, spread over many installations.
 *
 * Scenario options: those of `digital_experience_mobile` (platform, scale, seed;
 * withManualSpans has no effect).
 *
 * Run:
 *   node scripts/synthtrace digital_experience_mobile_minimal_app --from=now-30m --to=now
 */

import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { SEED_LOG_HINT } from './helpers/digital_experience_apps';
import {
  generateEdotReactNativeSessions,
  parseDigitalExperienceMobileScenarioOpts,
  type DigitalExperienceMobileApp,
} from './helpers/digital_experience_mobile_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const APP: DigitalExperienceMobileApp = {
  serviceName: 'minimal-mobile',
  versions: [{ serviceVersion: '1.0.0', buildNumber: 1, share: 1 }],
  appId: 'com.example.minimal',
  health: 'healthy',
  sessionsPerMinute: 1,
  model: {
    screens: [
      {
        name: 'Home',
        iosTitle: 'Home',
        requests: [{ method: 'GET', url: 'https://api.example-minimal.com/api/status' }],
      },
    ],
  },
};

const scenario: Scenario<OtelDocument> = async ({ scenarioOpts, logger, from }) => {
  const opts = parseDigitalExperienceMobileScenarioOpts(scenarioOpts, from);
  logger.info(
    `Generating EDOT React Native data of a minimal app with ${JSON.stringify(
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
