/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  InfraDocument,
  infra,
  AlertEntityDocument,
  alert,
  timerange,
} from '@kbn/apm-synthtrace-client';
import { times } from 'lodash';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<InfraDocument | AlertEntityDocument> = async ({
  logger,
  scenarioOpts = { numHosts: 2 },
}) => {
  return {
    generate: ({ clients: { infraEsClient, alertsEsClient } }) => {
      const from = '2024-09-19T15:17:26.764Z';
      const to = '2024-09-19T15:32:26.764Z';
      const range = timerange(from, to);
      const { numHosts } = scenarioOpts;
      const hostList = times(numHosts).map((index) => infra.host(`host-${index}`));
      const hosts = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          return hostList.flatMap((host) => [
            host.cpu({ cpuTotalValue: 0.9 }).timestamp(timestamp),
            host.memory().timestamp(timestamp),
            host.network().timestamp(timestamp),
            host.load().timestamp(timestamp),
            host.filesystem().timestamp(timestamp),
            host.diskio().timestamp(timestamp),
          ]);
        });

      const alertsList = times(numHosts).map(() =>
        alert({
          producer: 'infrastructure',
          consumer: 'infrastructure',
          category: 'Inventory',
        })
      );

      const alerts = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          return alertsList.flatMap((hostAlert, index) => [
            hostAlert.host({ hostName: `host-${index}`, from, to }).timestamp(timestamp),
          ]);
        });

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_infra_hosts', () => hosts)
        ),
        withClient(
          alertsEsClient,
          logger.perf('generating_alerts', () => alerts)
        ),
      ];
    },
  };
};

export default scenario;
