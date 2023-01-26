/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { observer, AgentConfigFields } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';

const scenario: Scenario<AgentConfigFields> = async ({ logger }) => {
  return {
    generate: ({ range }) => {
      const agentConfig = observer().agentConfig();

      return range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          const events = logger.perf('generating_agent_config_events', () => {
            return agentConfig.etag('test-etag').timestamp(timestamp);
          });
          return events;
        });
    },
  };
};

export default scenario;
