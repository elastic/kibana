/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { CliOptions } from './types';
import { createElasticAgentPolicy } from './lib/create_agent_policy';
import { fetchAgentPolicyEnrollmentToken } from './lib/fetch_agent_policy_enrollment_token';
import { enrollAgent } from './lib/enroll_agent';

export async function run(options: CliOptions, logger: ToolingLog) {
  const {
    item: { id: agentPolicyId },
  } = await createElasticAgentPolicy(options, logger);
  const { list } = await fetchAgentPolicyEnrollmentToken(options, logger, agentPolicyId);
  const [enrollmentTokenConfig] = list;
  const { api_key: enrollmentToken } = enrollmentTokenConfig;
  enrollAgent(options, logger, enrollmentToken);
}
