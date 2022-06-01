/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { observer, timerange } from '..';
import { Scenario } from '../scripts/scenario';
import { getLogger } from '../scripts/utils/get_common_services';
import { RunOptions } from '../scripts/utils/parse_run_cli_flags';
import { AgentConfigFields } from '../lib/agent_config/agent_config_fields';

const scenario: Scenario<AgentConfigFields> = async (runOptions: RunOptions) => {
  const logger = getLogger(runOptions);

  return {
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
