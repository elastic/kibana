/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates the EDOT React Native data of `digital_experience_mobile`, but for
 * weather-demo-react-native alone, with its three versions on both platforms.
 *
 * Scenario options: those of `digital_experience_mobile` (platform, withManualSpans, scale, seed).
 *
 * Run:
 *   node scripts/synthtrace digital_experience_mobile_single_app --from=now-30m --to=now
 */

import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { SEED_LOG_HINT } from './helpers/digital_experience_apps';
import {
  DIGITAL_EXPERIENCE_MOBILE_APPS,
  generateEdotReactNativeSessions,
  parseDigitalExperienceMobileScenarioOpts,
} from './helpers/digital_experience_mobile_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const APPS = DIGITAL_EXPERIENCE_MOBILE_APPS.filter(
  ({ serviceName }) => serviceName === 'weather-demo-react-native'
);

const scenario: Scenario<OtelDocument> = async ({ scenarioOpts, logger, from }) => {
  const opts = parseDigitalExperienceMobileScenarioOpts(scenarioOpts, from);
  logger.info(
    `Generating EDOT React Native data of a single app with ${JSON.stringify(
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
          apps: APPS,
        })
      ),
  };
};

export default scenario;
