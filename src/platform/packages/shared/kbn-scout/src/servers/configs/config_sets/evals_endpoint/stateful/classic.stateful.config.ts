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
 * Base endpoint evals stack: Elastic Defend only.
 *
 * The Osquery integration is deliberately NOT installed here. Endpoint evals
 * assert graceful degradation when Osquery is absent (e.g. ef-016), and a suite
 * that always installs osquery_manager can never observe that state — the
 * "not installed" branch would be unreachable and its eval vacuously green.
 *
 * The `agentBuilderTools` flag is set without the integration so the Osquery
 * tools register and capability detection stays exercisable.
 *
 * Osquery live-state evals use `evals_endpoint_osquery`, which extends this
 * config and adds the integration.
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        'automaticTroubleshootingSkill',
        'endpointForensicAnalysisSkill',
      ])}`,
      '--xpack.fleet.packages.0.name=endpoint',
      '--xpack.fleet.packages.0.version=latest',
      '--xpack.osquery.enableExperimental=["agentBuilderTools"]',
    ],
  },
};
