/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates EDOT Android and EDOT iOS data of native apps with the signal names proposed for the
 * SDKs, so the Digital Experience mobile views can be built before the SDKs ship them. If a name
 * changes in the SDKs, only the generator changes.
 *
 * Data shape (OTel-native, no APM enrichment):
 * - `logs-generic.otel-default`: `session.start` (with `session.previous_id` when the run has the
 *   installation's previous session), `session.end`, `elastic.app.start` (`start.type` cold or
 *   warm, `elastic.app.start.duration` in ms), `app.screen.click`, `app.widget.click`, `app.crash`
 *   (reported on the next launch, with the crash time), WARN `exception` events of handled errors,
 *   and ERROR logs of ANRs (`elastic.error.kind: anr`, Android) and hangs (`hang`, iOS)
 * - `traces-generic.otel-default`: `elastic.app.screen.load` spans with `app.screen.name`, which
 *   parent the HTTP CLIENT spans of the screen, and the SERVER spans of the backends that answer
 * - every span and log written while a screen is shown carries its `app.screen.name`
 *
 * Sessions start at their time, from the run's `from` on, and are written as they go; those still
 * running at the run's `to` are cut off there.
 *
 * Apps (`service.name`), each with three versions where the newest crashes more and starts slower.
 * The newest version rolls out over the first hours of the run, so its share grows over time:
 * - trailmap-android: Android only
 * - ride-ios: iOS only
 * - transit-companion: both platforms
 *
 * Scenario options:
 * - platform (android | ios | both, default: both): generates sessions of one platform only
 * - scale (number, default: 1): multiplies the number of sessions per minute of every app
 * - seed (string or number, default: the run's `from` in milliseconds): makes the data
 *   reproducible
 *
 * Run:
 *   node scripts/synthtrace digital_experience_mobile_native --from=now-30m --to=now
 *   node scripts/synthtrace digital_experience_mobile_native --live --scenarioOpts platform=ios
 */

import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { SEED_LOG_HINT } from './helpers/digital_experience_apps';
import {
  generateEdotNativeSessions,
  parseDigitalExperienceNativeScenarioOpts,
} from './helpers/digital_experience_mobile_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<OtelDocument> = async ({ scenarioOpts, logger, from }) => {
  const opts = parseDigitalExperienceNativeScenarioOpts(scenarioOpts, from);
  logger.info(`Generating EDOT native data with ${JSON.stringify(opts)}; ${SEED_LOG_HINT}`);

  return {
    generate: ({ range, clients: { otelEsClient } }) =>
      withClient(
        otelEsClient,
        generateEdotNativeSessions(range, { ...opts, environment: ENVIRONMENT, from })
      ),
  };
};

export default scenario;
