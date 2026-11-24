/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates one EDOT React Native app with many releases, for the release health section of the
 * Digital Experience mobile page:
 * - release-train-mobile: the shop-mobile app on seven releases, so the five with most sessions
 *   show by name and the other two as "Other". The newest, 6.0.0, rolls out halfway into the run,
 *   so it first appears inside the time range, and more of its HTTP requests fail, so its error
 *   rate rises above the others'.
 *
 * `digital_experience_mixed` includes this app too, so don't run both in one invocation.
 *
 * Scenario options: the same as `digital_experience_mobile` (platform, withManualSpans, scale,
 * seed).
 *
 * Run (the rollout starts 12 hours into the run, so a run of at least a day shows it):
 *   node scripts/synthtrace digital_experience_mobile_releases --from=now-24h --to=now
 */

import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { SEED_LOG_HINT } from './helpers/digital_experience_apps';
import {
  DIGITAL_EXPERIENCE_RELEASE_TRAIN_APP,
  generateEdotReactNativeSessions,
  parseDigitalExperienceMobileScenarioOpts,
} from './helpers/digital_experience_mobile_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<OtelDocument> = async ({ scenarioOpts, logger, from }) => {
  const opts = parseDigitalExperienceMobileScenarioOpts(scenarioOpts, from);
  logger.info(
    `Generating EDOT React Native release data with ${JSON.stringify(opts)}; ${SEED_LOG_HINT}`
  );

  return {
    generate: ({ range, clients: { otelEsClient } }) =>
      withClient(
        otelEsClient,
        generateEdotReactNativeSessions(range, {
          ...opts,
          environment: ENVIRONMENT,
          from,
          apps: [DIGITAL_EXPERIENCE_RELEASE_TRAIN_APP],
        })
      ),
  };
};

export default scenario;
