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
 * private location is not created here: create it first, in Kibana under Synthetics > Settings >
 * Private locations (it only needs a Fleet agent policy, no running agent). See EXAMPLES.md.
 * Without the two location options, the scenario uses the only private location of the space.
 *
 * Scenario options:
 * - privateLocationId (string, optional): id of the private location, with privateLocationLabel
 * - privateLocationLabel (string, optional): label of the private location, with privateLocationId
 * - monitors (number, default: 8): number of monitors
 * - seed (string, default: 'synthtrace'): makes the data reproducible
 * - spaceId (string, default: 'default'): Kibana space to create the monitors in
 * - deleteMonitorsOnExit (boolean, default: false): delete the monitors when the run ends
 *
 * Run (historical data only; do not use --clean, it removes every synthetics-* data stream):
 *   node scripts/synthtrace synthetics_overview --from=now-24h --to=now
 *
 * With several private locations, name the one to use:
 *   node scripts/synthtrace synthetics_overview --from=now-24h --to=now \
 *     --scenarioOpts.privateLocationId=<id> --scenarioOpts.privateLocationLabel="<label>"
 */

import type { SyntheticsMonitorDocument } from '@kbn/synthtrace-client';
import { createSeededRandom } from '@kbn/synthtrace-client';
import type { Scenario, ScenarioInitOptions } from '../cli/scenario';
import { getKibanaClient } from '../cli/utils/get_kibana_client';
import { getServiceUrls } from '../cli/utils/get_service_urls';
import { createSyntheticsMonitorsApi } from '../lib/synthetics/synthetics_monitors_api';
import { discoverPrivateLocation } from '../lib/synthetics/synthetics_private_locations_api';
import { withClient } from '../lib/utils/with_client';
import {
  SYNTHETICS_OVERVIEW_TAG,
  buildCheck,
  createCheckTimeline,
  getCheckTimestamp,
  getOverviewMonitors,
  parseSyntheticsOverviewOpts,
} from './helpers/synthetics_overview';

// Every worker runs the scenario factory, and none of them sees what `bootstrap` found, so the
// private location is looked up here, in the factory, when the options don't name one.
const findPrivateLocation = async (options: ScenarioInitOptions, spaceId: string) => {
  const { kibanaUrl, username, password, apiKey } = await getServiceUrls(options);
  const kibana = getKibanaClient({
    target: kibanaUrl,
    username,
    password,
    apiKey,
    logger: options.logger,
  });

  return discoverPrivateLocation({ kibana, spaceId });
};

const scenario: Scenario<SyntheticsMonitorDocument> = async (initOptions) => {
  const { scenarioOpts, from, to, logger } = initOptions;
  const opts = parseSyntheticsOverviewOpts(scenarioOpts);
  const { seed, spaceId } = opts;
  const privateLocation = opts.privateLocation ?? (await findPrivateLocation(initOptions, spaceId));
  const monitors = getOverviewMonitors({
    monitors: opts.monitors,
    privateLocation,
    spaceId,
  });

  return {
    bootstrap: async (_clients, kibanaClient) => {
      const monitorsApi = createSyntheticsMonitorsApi({
        kibana: kibanaClient,
        tag: SYNTHETICS_OVERVIEW_TAG,
        spaceId,
      });

      const deleted = await monitorsApi.deleteMonitors();
      await monitorsApi.createMonitors(monitors.map(({ config }) => config));
      logger.info(
        `Created ${monitors.length} monitors tagged ${SYNTHETICS_OVERVIEW_TAG}` +
          (deleted > 0 ? ` (replaced ${deleted} from an earlier run)` : '')
      );
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
            .generator((_rangeTimestamp, rangeIndex) => {
              const timestamp = getCheckTimestamp({
                index: rangeIndex,
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
        logger.info(
          `Leaving the monitors tagged ${SYNTHETICS_OVERVIEW_TAG} in place ` +
            '(pass --scenarioOpts.deleteMonitorsOnExit=true to delete them when the run ends)'
        );
        return;
      }

      const deleted = await createSyntheticsMonitorsApi({
        kibana: kibanaClient,
        tag: SYNTHETICS_OVERVIEW_TAG,
        spaceId,
      }).deleteMonitors();
      logger.info(`Deleted ${deleted} monitors tagged ${SYNTHETICS_OVERVIEW_TAG}`);
    },
  };
};

export default scenario;
