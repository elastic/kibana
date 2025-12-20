/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { infra } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

/**
 * Generates ECS-compliant infrastructure host metrics.
 * This scenario satisfies the 'ecs' schema requirement in getPreferredSchema.
 */
const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts = { numHosts: 2 } }) => {
  const { numHosts } = scenarioOpts;

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      // Create ECS hosts
      const hostList = times(numHosts).map((index) => infra.host(`ecs-host-${index}`));

      const hosts = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          hostList.flatMap((host) => [
            // Standard ECS metrics (system.cpu.*, system.memory.*, etc.)
            host.cpu().timestamp(timestamp),
            host.memory().timestamp(timestamp),
            host.network().timestamp(timestamp),
            host.load().timestamp(timestamp),
            host.filesystem().timestamp(timestamp),
            host.diskio().timestamp(timestamp),
          ])
        );

      return withClient(
        infraEsClient,
        logger.perf('generating_ecs_hosts', () => hosts)
      );
    },
  };
};

export default scenario;
