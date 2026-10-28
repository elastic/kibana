/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates EDOT Browser data (the `main` data shape of `@opentelemetry/browser-instrumentation`)
 * for several apps in different states of health, for Digital Experience development.
 *
 * Data shape (OTel-native, no APM enrichment):
 * - `logs-generic.otel-default`: `browser.navigation`, `browser.navigation_timing`,
 *   `browser.resource_timing`, `browser.web_vital`, `browser.user_action.click` and
 *   `exception` events
 * - `traces-generic.otel-default`: fetch/XHR CLIENT spans
 * - non-zero timings and web vital values always carry a fractional part, so they map as `float`;
 *   like EDOT Browser, phases that didn't happen are written as 0
 *
 * Apps (`service.name`):
 * - storefront-web: healthy, high traffic
 * - checkout-web: failing `POST /api/payment` and frequent JS errors
 * - media-portal-web: slow, poor LCP from large images and render-blocking CSS
 * - support-center-web: critical, poor INP/CLS and high error rate
 * - docs-web: healthy, low traffic, desktop-heavy, no environment
 *
 * Scenario options:
 * - withSessionId (boolean, default: true): write `attributes.session.id`, with the tab ID
 *   and `session.start` that come with sessions. Set to false to match EDOT Browser 0.3.0 and
 *   earlier, which don't emit them (elastic/elastic-otel-rum-js#120 added them). The apps then
 *   report distro version 0.3.0 instead of 0.4.0.
 * - includeRawAttribution (boolean, default: false): write the web-vitals attribution as a JSON
 *   body on `browser.web_vital` events, like the instrumentation's experimental opt-in option
 * - scale (number, default: 1): multiplies the number of sessions per minute of every app
 * - seed (string or number, default: random): makes the data reproducible
 *
 * Run:
 *   node scripts/synthtrace digital_experience_browser --from=now-30m --to=now
 *   node scripts/synthtrace digital_experience_browser --live --scenarioOpts withSessionId=false
 */

import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import {
  generateEdotBrowserSessions,
  parseDigitalExperienceScenarioOpts,
} from './helpers/digital_experience_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<OtelDocument> = async ({ scenarioOpts, logger, from }) => {
  const opts = parseDigitalExperienceScenarioOpts(scenarioOpts);
  logger.info(`Generating EDOT Browser data with ${JSON.stringify(opts)}`);

  return {
    generate: ({ range, clients: { otelEsClient } }) =>
      withClient(
        otelEsClient,
        generateEdotBrowserSessions(range, { ...opts, environment: ENVIRONMENT, from })
      ),
  };
};

export default scenario;
