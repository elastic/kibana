/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as evalsAgentBuilderConfig } from '../../evals_agent_builder/stateful/classic.stateful.config';

/**
 * Custom Scout stateful server configuration for PND (Project Daybreak /
 * Proactive Notification & Detection) eval suites — deep-watch-forensics,
 * watch-escalation-chain, threat-intel-hunt.
 *
 * Extends evals_agent_builder (which already brings evals_tracing: OTLP
 * exporting + preconfigured EIS connectors from KIBANA_TESTING_AI_CONNECTORS,
 * plus `agentBuilder:experimentalFeatures`) and adds:
 *   - `xpack.pnd.enabled` + `xpack.pnd.ui.useMockData=false` — the PND plugin
 *     is disabled by default (server/config.ts), so specs tagged
 *     `@local-stateful-classic` against a vanilla Kibana would 404 on every
 *     `/internal/pnd/*` route without this.
 *   - `workflowsManagement.enabled=true` is already the plugin default, but
 *     pinned explicitly here so this config set doesn't silently regress if
 *     that default ever flips.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_pnd
 *
 * This removes the need to hand-patch `.scout/servers/local.json` ports/flags
 * before running the PND eval suites — Scout resolves this config set by
 * name via `--serverConfigSet evals_pnd` (or the suite's `@local-stateful-classic`
 * tag routing, once wired into playwright.config.ts).
 */
export const servers: ScoutServerConfig = {
  ...evalsAgentBuilderConfig,
  kbnTestServer: {
    ...evalsAgentBuilderConfig.kbnTestServer,
    serverArgs: [
      ...evalsAgentBuilderConfig.kbnTestServer.serverArgs,
      '--xpack.pnd.enabled=true',
      '--xpack.pnd.ui.useMockData=false',
      '--workflowsManagement.enabled=true',
    ],
  },
};
