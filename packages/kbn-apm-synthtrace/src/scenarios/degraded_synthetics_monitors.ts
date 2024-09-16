/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  generateShortId,
  SyntheticsMonitorDocument,
  syntheticsMonitor,
} from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getIpAddress } from './helpers/logs_mock_data';
import { getAtIndexOrRandom } from './helpers/get_at_index_or_random';

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

const MONITOR_NAMES = Array(4)
  .fill(null)
  .map((_, idx) => `synth-monitor-${idx}`);

const ORIGINS = Array(4)
  .fill(null)
  .map((_, idx) => `synth-origin-${idx}`);

const STATUS = ['up', 'down', 'disabled'];

const OS = ['linux', 'windows', 'mac'];

const scenario: Scenario<SyntheticsMonitorDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { syntheticsEsClient } }) => {
      const { logger } = runOptions;

      const constructSyntheticsMonitorCommonData = (isMalformed?: boolean) => {
        const index = Math.floor(Math.random() * 4);
        const monitorName = getAtIndexOrRandom(MONITOR_NAMES, index);
        const origin = getAtIndexOrRandom(ORIGINS, index);
        const ip = getIpAddress(index);
        const status = getAtIndexOrRandom(STATUS, index);
        const os = getAtIndexOrRandom(OS, index);

        const commonSyntheticsMonitorEntryFields: SyntheticsMonitorDocument = {
          'monitor.id': generateShortId(),
          'monitor.check_group': generateShortId(),
          'monitor.timespan.lt': '2024-08-30T11:03:33.594Z',
          'monitor.timespan.gte': '2024-08-30T11:02:33.594Z',
        };

        return {
          index,
          monitorName,
          origin,
          ip,
          status,
          os,
          commonLongEntryFields: commonSyntheticsMonitorEntryFields,
        };
      };

      const datasetSynth1Monitors = (timestamp: number) => {
        const { monitorName, origin, ip, status, commonLongEntryFields } =
          constructSyntheticsMonitorCommonData();

        return syntheticsMonitor
          .create()
          .dataset('http')
          .name(monitorName)
          .origin(origin)
          .ip(ip)
          .defaults(commonLongEntryFields)
          .timestamp(timestamp)
          .status(status);
      };

      const datasetSynth2Monitors = (i: number, timestamp: number) => {
        const { monitorName, origin, commonLongEntryFields } =
          constructSyntheticsMonitorCommonData();
        const isMalformed = i % 90 === 0;
        return syntheticsMonitor
          .create()
          .dataset('browser')
          .name(monitorName)
          .origin(origin)
          .defaults({
            ...commonLongEntryFields,
            'synthetics.type': isMalformed
              ? MORE_THAN_1024_CHARS // "ignore_above": 1024 in mapping
              : 'step/metrics',
          })
          .timestamp(timestamp);
      };

      const datasetSynth3Monitors = (i: number, timestamp: number) => {
        const { monitorName, origin, os, commonLongEntryFields } =
          constructSyntheticsMonitorCommonData();
        const isMalformed = i % 60 === 0;
        return syntheticsMonitor
          .create()
          .dataset('browser.screenshot')
          .name(monitorName)
          .origin(origin)
          .defaults({
            ...commonLongEntryFields,
            'synthetics.type': 'step/screenshot_ref',
            'observer.os.name': isMalformed
              ? MORE_THAN_1024_CHARS // "ignore_above": 1024 in mapping
              : os,
          })
          .timestamp(timestamp);
      };

      const datasetSynth4Monitors = (i: number, timestamp: number) => {
        const { monitorName, origin, commonLongEntryFields } =
          constructSyntheticsMonitorCommonData();
        const isMalformed = i % 30 === 0;
        return syntheticsMonitor
          .create()
          .dataset('browser.network')
          .name(monitorName)
          .origin(origin)
          .defaults({
            ...commonLongEntryFields,
            'synthetics.type': isMalformed
              ? MORE_THAN_1024_CHARS // "ignore_above": 1024 in mapping
              : 'journey/network_info',
            'observer.product': isMalformed
              ? MORE_THAN_1024_CHARS // "ignore_above": 1024 in mapping
              : `synth-product-${i}`,
          })
          .timestamp(timestamp);
      };

      const monitors = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(200)
            .fill(0)
            .flatMap((_, index) => [
              datasetSynth1Monitors(timestamp),
              datasetSynth2Monitors(index, timestamp),
              datasetSynth3Monitors(index, timestamp),
              datasetSynth4Monitors(index, timestamp),
            ]);
        });

      return withClient(
        syntheticsEsClient,
        logger.perf('generating_synthetics_monitors', () => monitors)
      );
    },
  };
};

export default scenario;
