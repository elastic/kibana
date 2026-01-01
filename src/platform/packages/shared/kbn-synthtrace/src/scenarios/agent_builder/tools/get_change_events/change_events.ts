/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Change Events
 *
 * Story: Simulates deployment and configuration change events for `checkout-service`.
 *
 * - Deployment of v1.1.0 (success)
 * - Configuration change: Feature flag `enable_fast_checkout` enabled
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_change_events",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now"
 *   }
 * }
 * ```
 */

import { log } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../../cli/scenario';
import { withClient } from '../../../../lib/utils/with_client';

const scenario: Scenario = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const deploymentTime = range.to.valueOf() - 30 * 60 * 1000; // 30 mins ago
      const configChangeTime = range.to.valueOf() - 15 * 60 * 1000; // 15 mins ago

      const data = range
        .interval('1h') // Only need to run once as we inject specific timestamps
        .rate(1)
        .generator(() => {
          const deploymentEvent = log
            .create()
            .timestamp(deploymentTime)
            .message('Deployment of checkout-service v1.1.0 completed successfully')
            .service('checkout-service')
            .defaults({
              'event.category': 'deployment',
              'event.type': 'change',
              'event.action': 'deployment-success',
              'service.name': 'checkout-service',
              'service.version': '1.1.0',
              'service.environment': 'production',
              // @ts-expect-error
              'deployment.version': '1.1.0',
              'deployment.environment': 'production',
            });

          const configEvent = log
            .create()
            .timestamp(configChangeTime)
            .message('Configuration change: Feature flag enable_fast_checkout set to true')
            .service('checkout-service')
            .defaults({
              'event.category': 'configuration',
              'event.type': 'change',
              'service.name': 'checkout-service',
              'service.environment': 'production',
              // @ts-expect-error
              'feature_flag.key': 'enable_fast_checkout',
              'feature_flag.variant': 'true',
            });

          return [deploymentEvent, configEvent];
        });

      return withClient(logsEsClient, data);
    },
  };
};

export default scenario;
