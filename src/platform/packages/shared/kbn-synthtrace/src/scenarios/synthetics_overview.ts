/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a mix of HTTP, TCP, ICMP and browser monitors on an existing private location,
 * with healthy, flapping, down and recently failing monitors, so that the Synthetics
 * Overview, Monitors and monitor details pages have data to show.
 *
 * `bootstrap` creates the monitor configurations through the Kibana API (they carry a marker
 * tag, and a re-run replaces them) and `generate` writes the matching check documents. The
 * private location is not created here: create it first, for example with `run-data synthetics`.
 *
 * Scenario options:
 * - privateLocationId (string, required): id of the private location
 * - privateLocationLabel (string, required): label of the private location
 * - monitors (number, default: 8): number of monitors
 * - seed (string, default: 'synthtrace'): makes the data reproducible
 * - spaceId (string, default: 'default'): Kibana space to create the monitors in
 * - deleteMonitorsOnExit (boolean, default: false): delete the monitors when the run ends
 *
 * Run (historical data only; do not use --clean, it removes every synthetics-* data stream):
 *   node scripts/synthtrace synthetics_overview --from=now-24h --to=now \
 *     --scenarioOpts.privateLocationId=<id> --scenarioOpts.privateLocationLabel="<label>"
 */

import type { SyntheticsMonitorDocument } from '@kbn/synthtrace-client';
import { createSeededRandom } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { createSyntheticsMonitorsApi } from '../lib/synthetics/synthetics_monitors_api';
import { withClient } from '../lib/utils/with_client';
import {
  SYNTHETICS_OVERVIEW_TAG,
  buildCheck,
  createCheckTimeline,
  getCheckTimestamp,
  getOverviewMonitors,
  parseSyntheticsOverviewOpts,
} from './helpers/synthetics_overview';

const scenario: Scenario<SyntheticsMonitorDocument> = async ({ scenarioOpts, from, to }) => {
  const opts = parseSyntheticsOverviewOpts(scenarioOpts);
  const { privateLocation, seed, spaceId } = opts;
  const monitors = getOverviewMonitors(opts);

  return {
    bootstrap: async (_clients, kibanaClient) => {
      const monitorsApi = createSyntheticsMonitorsApi({
        kibana: kibanaClient,
        tag: SYNTHETICS_OVERVIEW_TAG,
        spaceId,
      });

      await monitorsApi.deleteMonitors();
      await monitorsApi.createMonitors(monitors.map(({ config }) => config));
    },

    generate: ({ range, clients: { syntheticsEsClient } }) =>
      withClient(
        syntheticsEsClient,
        monitors.map(({ config, pattern }) => {
          const { id, scheduleMinutes } = config;
          const getCheck = createCheckTimeline({
            pattern,
            scheduleMinutes,
            monitorId: id,
            seed,
            from,
            to,
          });

          return range
            .interval(`${scheduleMinutes}m`)
            .rate(1)
            .generator((rangeTimestamp) => {
              const timestamp = getCheckTimestamp({
                timestamp: rangeTimestamp,
                rangeFrom: range.from.getTime(),
                rangeTo: range.to.getTime(),
                from,
                scheduleMinutes,
              });
              if (timestamp === undefined) {
                return [];
              }

              const { index, outcome, streak } = getCheck(timestamp);

              return buildCheck({
                config,
                location: privateLocation,
                spaceId,
                timestamp,
                outcome,
                streak,
                random: createSeededRandom(`${seed}:${id}:${index}`),
              });
            });
        })
      ),

    teardown: async (_clients, kibanaClient) => {
      if (!opts.deleteMonitorsOnExit) {
        return;
      }

      await createSyntheticsMonitorsApi({
        kibana: kibanaClient,
        tag: SYNTHETICS_OVERVIEW_TAG,
        spaceId,
      }).deleteMonitors();
    },
  };
};

export default scenario;
