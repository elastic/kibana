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
 * - `logs-rum.replay.otel-default`: session replay, with the `replayRate` and `errorReplayRate`
 *   options only (see Session replay below)
 * - non-zero timings and web vital values always carry a fractional part, so they map as `float`;
 *   like EDOT Browser, phases that didn't happen are written as 0
 * - uncaught exceptions repeat: an exception thrown from one call stack always has the same stack
 *   trace, so occurrences add up in error groups (type and stack trace), with a few groups per app.
 *   Stack traces are written the way the browser does, so Firefox and Safari have groups of their own
 * - pages load many resources, some of them only on some page loads (lazy chunks, third parties,
 *   images), and the apps make requests to many URLs: one with a slow tail (`GET /api/recommendations`
 *   of storefront-web), one URL per order (`GET /api/orders/<id>` of storefront-web, some not
 *   found) and one answering 404 (`GET /api/user/preferences` of media-portal-web)
 *
 * Apps (`service.name`):
 * - storefront-web: healthy, high traffic, few JS errors
 * - checkout-web: failing `POST /api/payment` and frequent JS errors
 * - media-portal-web: slow, poor LCP from large images and render-blocking CSS
 * - support-center-web: critical, poor INP/CLS and high error rate
 * - docs-web: healthy, low traffic, desktop-heavy, no environment
 *
 * Environment (`deployment.environment.name`): `Synthtrace: digital_experience_browser` for all
 * apps but docs-web, which has none. With `environments=true`, every app is spread over its own:
 * - storefront-web and checkout-web: `production` (most of the traffic), `staging` (with errors
 *   that don't happen in production) and `preview`, which has page loads but reports no
 *   exceptions and no resource timings
 * - media-portal-web: `production` and `preview`
 * - support-center-web: `production` and `staging`
 * - docs-web: `production` and traffic with no environment
 *
 * Edge cases (`edgeCases=true`) add what is far from the usual, modelled on what real sites send:
 * - URLs of 800 to 4,000 characters (tag managers, pixels, signed storage links, ad clicks, search
 *   state in the query), percent-encoded paths and punycode hosts, 200 product URLs, and the pages
 *   of a list (`/products?page=N`)
 * - stack traces of 10 to 80 frames, one over 8,191 characters, anonymous and extension frames,
 *   messages with several lines, JSON, URLs and other scripts in them, and one error with 150
 *   distinct stack traces in support-center-web
 * - what isn't an error: no exception type, no stack trace or an empty one
 * - browsers that EDOT Browser can't identify (no name, platform and mobile flag), and clicks on
 *   elements with no CSS selector
 *
 * Session replay (`replayRate` or `errorReplayRate` above 0) follows the wire format of the EDOT
 * Browser session replay design (elastic/elastic-otel-rum-js, `design/session-replay.md`), with the
 * same `session.id` and `browser.tab.id` as the session's other signals:
 * - one segment for every page load that records, from the page load, or from a few seconds before
 *   the first uncaught exception in `error` mode. A segment has an `elastic.replay.start` record
 *   and a record for every rrweb event, numbered from 0 with a Meta and a FullSnapshot first
 * - events over 256 KiB are split in chunks (`elastic.replay.chunk.index` and `.count`), and some
 *   sessions pack their events with `@rrweb/packer` (`elastic.replay.packed`)
 * - the rrweb events are built from full snapshots of the synthetic pages of the
 *   `@kbn/session-replay-player` fixtures, so they play in the player. Clicks and exceptions of the
 *   OTel data show up in the recording at the same time
 * - with `edgeCases=true`, a share of the recorded sessions has a segment that lost a chunk of its
 *   first FullSnapshot (the player drops it and carries on from the next one), and a share starts
 *   recording with its second page
 *
 * Scenario options:
 * - withSessionId (boolean, default: true): write `attributes.session.id`, with the tab ID
 *   and `session.start` that come with sessions. Set to false to match EDOT Browser 0.3.0 and
 *   earlier, which don't emit them (elastic/elastic-otel-rum-js#120 added them). The apps then
 *   report distro version 0.3.0 instead of 0.4.0.
 * - includeRawAttribution (boolean, default: false): write the web-vitals attribution as a JSON
 *   body on `browser.web_vital` events, like the instrumentation's experimental opt-in option
 * - environments (boolean, default: false): spread every app over the environments listed above
 *   instead of the single one. Staging and preview carry less traffic: use `scale` or a longer
 *   range for more data in them.
 * - edgeCases (boolean, default: false): add the edge cases listed above. Use a `scale` of 3 for an
 *   hour, or run for several hours, to see all the stack traces of support-center-web.
 * - replayRate (number from 0 to 1, default: 0): share of sessions recorded from the start. Which
 *   sessions record is decided by their `session.id`, as EDOT Browser does
 * - errorReplayRate (number from 0 to 1, default: 0): share of the other sessions that start
 *   recording at their first uncaught exception, with trigger `error`. Those with no exception
 *   have no replay
 * - replaySize (`light`, `typical` or `heavy`, default: `typical`): about 50 KB, 0.5 MB and 4 to 5 MB
 *   of uncompressed rrweb events per recorded session. Replay is about 10 times the bytes of the
 *   rest of the data: use `--workers` and a lower `replayRate` for volume runs
 * - scale (number, default: 1): multiplies the number of sessions per minute of every app
 * - seed (string or number, default: the run's `from` in milliseconds): makes the data
 *   reproducible
 *
 * Run:
 *   node scripts/synthtrace digital_experience_browser --from=now-30m --to=now
 *   node scripts/synthtrace digital_experience_browser --live --scenarioOpts withSessionId=false
 *   node scripts/synthtrace digital_experience_browser --from=now-1h --to=now --scenarioOpts environments=true
 *   node scripts/synthtrace digital_experience_browser --from=now-1h --to=now --scenarioOpts edgeCases=true,scale=3
 *   node scripts/synthtrace digital_experience_browser --from=now-1h --to=now --scenarioOpts replayRate=0.3,errorReplayRate=0.5
 */

import type { Scenario } from '../cli/scenario';
import type { OtelDocument } from '../lib/otel/otel_synthtrace_es_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import {
  generateEdotBrowserSessions,
  parseDigitalExperienceScenarioOpts,
  SEED_LOG_HINT,
} from './helpers/digital_experience_apps';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<OtelDocument> = async ({ scenarioOpts, logger, from }) => {
  const opts = parseDigitalExperienceScenarioOpts(scenarioOpts, from);
  logger.info(`Generating EDOT Browser data with ${JSON.stringify(opts)}; ${SEED_LOG_HINT}`);

  return {
    generate: ({ range, clients: { otelEsClient } }) =>
      withClient(
        otelEsClient,
        generateEdotBrowserSessions(range, { ...opts, environment: ENVIRONMENT, from })
      ),
  };
};

export default scenario;
