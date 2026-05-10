/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';

/**
 * Custom Scout stateful server configuration for the **autonomously-architected** PCI DSS
 * v4.0.1 compliance skill eval variant. Enables the Agent Builder experimental features UI
 * setting and ONLY the autonomous skill flag (the hand-written `pciComplianceAgentBuilder`
 * is intentionally NOT enabled here so the agent router has only one PCI skill to choose
 * from — keeping the comparison clean).
 *
 * Pair this config set with `EVAL_PCI_VARIANT=autonomous` when running the eval suite to
 * label outputs and side-by-side reports correctly.
 *
 * Usage:
 *   node scripts/scout start-server \\
 *     --arch stateful --domain classic --serverConfigSet evals_pci_compliance_autonomous
 *
 *   EVAL_PCI_VARIANT=autonomous node scripts/evals start --suite pci-compliance
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        'pciComplianceAutonomousAgentBuilder',
      ])}`,
    ],
  },
};
