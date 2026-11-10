/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates EDOT Browser apps (see `digital_experience_browser`) and EDOT React Native apps (see
 * `digital_experience_mobile`) next to a classic Elastic APM RUM (`rum-js`) app, so the Digital
 * Experience applications list shows `otel`, mobile and `classic` apps.
 *
 * Data shape:
 * - EDOT Browser: OTel-native logs and spans in `logs-generic.otel-default` and
 *   `traces-generic.otel-default`
 * - EDOT React Native: OTel-native logs and spans in the same data streams, on Android and iOS,
 *   with the `app.launch` and screen spans that some of the apps create themselves
 * - classic RUM (`storefront-web`): page-load transactions with a few XHR spans in
 *   `traces-apm.rum-default`. Minimal on purpose: no marks or experience metrics. Page loads end
 *   at their generated time, so the first ones of a run may start before `--from`.
 *
 * Scenario options:
 * - withSessionId (boolean, default: true): write `attributes.session.id` on EDOT Browser data
 * - includeRawAttribution (boolean, default: false): write web vital attribution JSON bodies
 * - environments (boolean, default: false): spread the EDOT Browser apps over several
 *   environments. The classic RUM app then runs in `production`.
 * - scale (number, default: 1): multiplies the number of sessions/page loads per minute
 * - seed (string or number, default: the run's `from` in milliseconds): makes the data
 *   reproducible
 *
 * The mobile apps always run on both platforms with their manual spans, so that every kind of app
 * shows up; `platform` and `withManualSpans` are options of `digital_experience_mobile` only.
 *
 * Run:
 *   node scripts/synthtrace digital_experience_mixed --from=now-30m --to=now
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import {
  generateEdotBrowserSessions,
  parseDigitalExperienceScenarioOpts,
  PRODUCTION_ENVIRONMENT,
  SEED_LOG_HINT,
} from './helpers/digital_experience_apps';
import { generateClassicRumPageLoads } from './helpers/classic_rum_page_loads';
import { generateEdotReactNativeSessions } from './helpers/digital_experience_mobile_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<OtelDocument | ApmFields> = async ({ scenarioOpts, logger, from }) => {
  // The EDOT Browser, EDOT React Native and classic RUM data derive from the same seed
  const opts = parseDigitalExperienceScenarioOpts(scenarioOpts, from);
  logger.info(
    `Generating EDOT Browser, EDOT React Native and classic RUM data with ${JSON.stringify(
      opts
    )}; ${SEED_LOG_HINT}`
  );

  return {
    generate: ({ range, clients: { otelEsClient, apmEsClient } }) => [
      withClient(
        otelEsClient,
        generateEdotBrowserSessions(range, { ...opts, environment: ENVIRONMENT, from })
      ),
      withClient(
        otelEsClient,
        generateEdotReactNativeSessions(range, {
          scale: opts.scale,
          seed: opts.seed,
          platform: 'both',
          withManualSpans: true,
          environment: ENVIRONMENT,
          from,
        })
      ),
      withClient(
        apmEsClient,
        // With environments, the classic agent is the one of the production storefront
        generateClassicRumPageLoads(range, {
          ...opts,
          environment: opts.environments ? PRODUCTION_ENVIRONMENT : ENVIRONMENT,
        })
      ),
    ],
  };
};

export default scenario;
