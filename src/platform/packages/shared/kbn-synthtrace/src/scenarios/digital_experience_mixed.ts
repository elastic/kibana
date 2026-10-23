/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates EDOT Browser apps (see `digital_experience_browser`) next to a classic Elastic APM
 * RUM (`rum-js`) app, so the Digital Experience applications list shows both `otel` and
 * `classic` apps.
 *
 * Data shape:
 * - EDOT Browser: OTel-native logs and spans in `logs-generic.otel-default` and
 *   `traces-generic.otel-default`
 * - classic RUM (`storefront-web`): page-load transactions with a few XHR spans in
 *   `traces-apm.rum-default`. Minimal on purpose: no marks or experience metrics.
 *
 * Scenario options:
 * - withSessionId (boolean, default: true): write `attributes.session.id` on EDOT Browser data
 * - includeRawAttribution (boolean, default: false): write web vital attribution JSON bodies
 * - scale (number, default: 1): multiplies the number of sessions/page loads per minute
 * - seed (string or number, default: random): makes the data reproducible
 *
 * Run:
 *   node scripts/synthtrace digital_experience_mixed --from=now-30m --to=now
 */

import { apm, type ApmFields } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { createSeededRandom } from '../lib/utils/seeded_random';
import {
  generateEdotBrowserSessions,
  generatePerMinute,
  parseDigitalExperienceScenarioOpts,
} from './helpers/digital_experience_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

// The storefront is instrumented with both agents, so the apps list shows the two together
const CLASSIC_RUM_SERVICE_NAME = 'storefront-web';
const CLASSIC_RUM_PAGE_LOADS_PER_MINUTE = 3;
const CLASSIC_RUM_PAGES = ['/', '/products', '/products/:id', '/cart'] as const;
const CLASSIC_RUM_REQUESTS = ['GET /api/products', 'GET /api/cart', 'GET /api/recommendations'];

const scenario: Scenario<OtelDocument | ApmFields> = async ({ scenarioOpts, logger, from }) => {
  const parsedOpts = parseDigitalExperienceScenarioOpts(scenarioOpts);
  // Both the EDOT Browser and the classic RUM data derive from the same seed
  const opts = { ...parsedOpts, seed: parsedOpts.seed ?? String(Math.random()) };
  logger.info(`Generating EDOT Browser and classic RUM data with ${JSON.stringify(opts)}`);

  return {
    generate: ({ range, clients: { otelEsClient, apmEsClient } }) => {
      const classicRum = apm.browser({
        serviceName: CLASSIC_RUM_SERVICE_NAME,
        environment: ENVIRONMENT,
        userAgent: apm.getChromeUserAgentDefaults(),
      });

      const classicPageLoads = generatePerMinute<ApmFields>(
        range,
        CLASSIC_RUM_PAGE_LOADS_PER_MINUTE * opts.scale,
        ({ time, index }) => {
          const random = createSeededRandom(`${opts.seed}:${CLASSIC_RUM_SERVICE_NAME}:${index}`);
          const pageLoadDuration = 800 + Math.round(random() * 2400);
          const requestName = CLASSIC_RUM_REQUESTS[index % CLASSIC_RUM_REQUESTS.length];

          return classicRum
            .transaction({ transactionName: CLASSIC_RUM_PAGES[index % CLASSIC_RUM_PAGES.length] })
            .timestamp(time)
            .duration(pageLoadDuration)
            .success()
            .children(
              classicRum
                .span({ spanName: requestName, spanType: 'external', spanSubtype: 'http' })
                .timestamp(time + Math.round(pageLoadDuration * 0.6))
                .duration(50 + Math.round(random() * 250))
                .success()
            );
        }
      );

      return [
        withClient(
          otelEsClient,
          generateEdotBrowserSessions(range, { ...opts, environment: ENVIRONMENT, from })
        ),
        withClient(apmEsClient, classicPageLoads),
      ];
    },
  };
};

export default scenario;
