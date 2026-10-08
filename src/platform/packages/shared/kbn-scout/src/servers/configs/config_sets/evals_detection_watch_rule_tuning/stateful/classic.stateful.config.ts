/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as ruleCreationConfig } from '../../evals_detection_watch_rule_creation/stateful/classic.stateful.config';

/**
 * Config set for the detection-watch-rule-tuning eval suite. The suite drives the managed
 * rule-tuning worker + review workflows the alertzero plugin installs at start, so everything
 * the rule-creation set enables (alertzero, the Workflows UI and agent settings, and the inbox
 * plugin's respond route that resumes the review child's approval gate) is required here too.
 *
 * Additionally, `agenticInvestigations` is a requiredPlugin of alertzero
 * (x-pack/solutions/security/plugins/alertzero/kibana.jsonc) whose `enabled` config defaults to
 * false, so it must be turned on explicitly. Kibana otherwise disables alertzero entirely (core
 * refuses to start a plugin whose required plugins are disabled), the managed tuning workflows
 * are never installed, and every test 404s on `Workflow not found`.
 *
 * `investigateRuleSkill` gates registration of the `investigate-rule` Agent Builder skill (default
 * off). The review workflow's diagnose step is told to call `investigate-rule.get_alerts_by_ids`,
 * so without the flag the tool does not exist, the model can never call it, and Tool Routing reads
 * 0.000 for a stack reason rather than a model one.
 */
const ENABLE_EXPERIMENTAL_PREFIX = '--xpack.securitySolution.enableExperimental=';
const REQUIRED_EXPERIMENTAL_FEATURES = ['investigateRuleSkill'];

const inheritedArgs = ruleCreationConfig.kbnTestServer.serverArgs;
const inheritedExperimental = inheritedArgs
  .filter((arg) => arg.startsWith(ENABLE_EXPERIMENTAL_PREFIX))
  .flatMap((arg) => JSON.parse(arg.slice(ENABLE_EXPERIMENTAL_PREFIX.length)) as string[]);

export const servers: ScoutServerConfig = {
  ...ruleCreationConfig,
  kbnTestServer: {
    ...ruleCreationConfig.kbnTestServer,
    serverArgs: [
      // Kibana honours a single enableExperimental value, so merge into it rather than append.
      ...inheritedArgs.filter(
        (arg) =>
          !arg.startsWith(ENABLE_EXPERIMENTAL_PREFIX) &&
          arg !== '--xpack.agenticInvestigations.enabled=true'
      ),
      '--xpack.agenticInvestigations.enabled=true',
      `${ENABLE_EXPERIMENTAL_PREFIX}${JSON.stringify([
        ...new Set([...inheritedExperimental, ...REQUIRED_EXPERIMENTAL_FEATURES]),
      ])}`,
    ],
  },
};
