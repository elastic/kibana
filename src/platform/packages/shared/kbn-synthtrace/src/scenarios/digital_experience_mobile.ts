/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates EDOT React Native data, as `@elastic/otel-react-native` records it through EDOT Android
 * (1.10.0) and EDOT iOS (2.3.0), for several apps in different states of health, for Digital
 * Experience development.
 *
 * Data shape (OTel-native, no APM enrichment):
 * - `traces-generic.otel-default`: HTTP CLIENT spans (OkHttp on Android, URLSession on iOS), iOS
 *   `<screen> - view appearing` spans, and the `app.launch` and screen spans some apps create
 *   themselves with the bridge's `startSpan()`
 * - `logs-generic.otel-default`: `app.crash`, `app.widget.click` and iOS `device.app.lifecycle`
 *   events, ERROR logs of the bridge's `emitLog()`, and the `exception` span events of failed
 *   HTTP requests
 * - every span and log of a session carries its `session.id`, lowercase on Android and uppercase
 *   on iOS, except the `exception` span events, which only link to their span. Neither SDK writes
 *   a React Native marker, a launch span or Android screen spans.
 *
 * Apps (`service.name`):
 * - weather-demo-react-native: healthy, like the EDOT weather demos: forecasts for New York fail
 *   with a 500 and an ERROR log. Creates its own `app.launch` span.
 * - shop-mobile: healthy, high traffic, mostly Android, creates launch and screen spans
 * - banking-mobile: erroring, mostly iOS, failing `POST /api/transfers`, frequent crashes
 * - news-mobile: slow, high HTTP latency and many cellular connections
 * - field-service-mobile: critical, Android only, no environment
 *
 * Scenario options:
 * - platform (android | ios | both, default: both): generates sessions of one platform only
 * - withManualSpans (boolean, default: true): set to false to drop the `app.launch` and screen
 *   spans the apps create themselves, which leaves only what the SDKs record on their own
 * - scale (number, default: 1): multiplies the number of sessions per minute of every app
 * - seed (string or number, default: random): makes the data reproducible
 *
 * Run:
 *   node scripts/synthtrace digital_experience_mobile --from=now-30m --to=now
 *   node scripts/synthtrace digital_experience_mobile --live --scenarioOpts platform=ios
 */

import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import {
  generateEdotReactNativeSessions,
  parseDigitalExperienceMobileScenarioOpts,
} from './helpers/digital_experience_mobile_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<OtelDocument> = async ({ scenarioOpts, logger, from }) => {
  const opts = parseDigitalExperienceMobileScenarioOpts(scenarioOpts);
  logger.info(`Generating EDOT React Native data with ${JSON.stringify(opts)}`);

  return {
    generate: ({ range, clients: { otelEsClient } }) =>
      withClient(
        otelEsClient,
        generateEdotReactNativeSessions(range, { ...opts, environment: ENVIRONMENT, from })
      ),
  };
};

export default scenario;
