/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { observer, timerange } from '../../..';
import { Scenario } from '../../cli/scenario';
import { getLogger } from '../../cli/utils/get_common_services';
import { ScenarioOptions } from '../../cli/utils/get_scenario_options';
import { AgentConfigFields } from '../../dsl/apm/agent_config/agent_config_fields';
import { ApmScenarioDefaults } from '../../lib/apm/apm_scenario_defaults';

/** node scripts/synthtrace apm/agent_config.ts --local --maxDocs 10 --clean */
const scenario: Scenario<AgentConfigFields> = async (options: ScenarioOptions) => {
  const logger = getLogger(options);

  return {
    ...ApmScenarioDefaults,
    generate: ({ from, to }) => {
      const agentConfig = observer().agentConfig();

      const range = timerange(from, to);
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
