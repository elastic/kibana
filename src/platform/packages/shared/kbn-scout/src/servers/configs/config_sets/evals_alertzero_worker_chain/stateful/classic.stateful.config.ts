/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as fpTpConfig } from '../../evals_attack_discovery_fp_tp/stateful/classic.stateful.config';

/**
 * Config set for the alertzero-worker-chain eval suite: everything the attack-discovery-fp-tp
 * set provides, plus the `investigateRuleSkill` experimental feature.
 *
 * The seeded Rule Tuning review pins `skill_ids: [investigate-rule]` on its `diagnose_rule`
 * step, and that skill only registers when `investigateRuleSkill` is on (it ships `false`
 * upstream). Without it the agent can only propose manual changes and the
 * TP-suppressed-by-tuning gate is never exercised. The flag lives here, not in
 * `evals_attack_discovery_fp_tp`, because other suites share that set and their scored history
 * was measured without it.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_alertzero_worker_chain
 */
export const servers: ScoutServerConfig = {
  ...fpTpConfig,
  kbnTestServer: {
    ...fpTpConfig.kbnTestServer,
    serverArgs: [
      ...fpTpConfig.kbnTestServer.serverArgs,
      `--xpack.securitySolution.enableExperimental=${JSON.stringify(['investigateRuleSkill'])}`,
    ],
  },
};
