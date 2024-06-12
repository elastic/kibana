/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InfraDocument, infra, generateShortId } from '@kbn/apm-synthtrace-client';

import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<InfraDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const { numContainers = 5 } = runOptions.scenarioOpts || {};
      const { logger } = runOptions;

      const CONTAINERS = Array(numContainers)
        .fill(0)
        .map((_, idx) => {
          const id = generateShortId();
          return infra.dockerContainer(id).defaults({
            'container.name': `container-${idx}`,
            'container.id': id,
            'container.runtime': 'docker',
            'container.image.name': 'image-1',
            'host.name': 'host-1',
            'cloud.instance.id': 'instance-1',
            'cloud.image.id': 'image-1',
            'cloud.provider': 'aws',
            'event.dataset': 'docker.container',
          });
        });

      const containers = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          CONTAINERS.flatMap((container) => [container.metrics().timestamp(timestamp)])
        );

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_infra_docker_containers', () => containers)
        ),
      ];
    },
  };
};

export default scenario;
