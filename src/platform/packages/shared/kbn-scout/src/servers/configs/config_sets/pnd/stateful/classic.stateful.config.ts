/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';

interface AvailableConnector {
  name: string;
  actionTypeId: string;
  exposeConfig?: boolean;
  config: Record<string, unknown>;
  secrets?: Record<string, unknown>;
}

/**
 * Reads `KIBANA_TESTING_AI_CONNECTORS` (base64 JSON, produced by `node scripts/evals init`
 * or hydrated from `~/.elastic/eis-connectors-cache.json`) and turns it into a
 * `--xpack.actions.preconfigured` server arg so `.inference` EIS connectors exist
 * without needing live EIS/CCM auth against this ephemeral Scout ES instance.
 * Mirrors `config_sets/evals_tracing/stateful/classic.stateful.config.ts` — kept
 * as a local copy rather than a shared import since Scout config sets are
 * self-contained modules loaded by filename convention.
 */
function getPreconfiguredEisConnectorsArg(): string | undefined {
  const raw = process.env.KIBANA_TESTING_AI_CONNECTORS;
  if (!raw) return;

  let connectors: Record<string, AvailableConnector>;
  try {
    connectors = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as Record<
      string,
      AvailableConnector
    >;
  } catch (e) {
    throw new Error(
      `Failed to parse base64 JSON from KIBANA_TESTING_AI_CONNECTORS: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }

  const eisConnectors: Record<string, AvailableConnector> = {};
  for (const [id, connector] of Object.entries(connectors)) {
    if (!connector || typeof connector !== 'object') continue;
    if (connector.actionTypeId !== '.inference') continue;
    if (connector.config?.provider !== 'elastic') continue;
    eisConnectors[id] = { ...connector, exposeConfig: true };
  }

  if (Object.keys(eisConnectors).length === 0) return;

  return `--xpack.actions.preconfigured=${JSON.stringify(eisConnectors)}`;
}

const preconfiguredEisConnectorsArg = getPreconfiguredEisConnectorsArg();

/**
 * Scout server configuration for the PND (investigations) plugin.
 *
 * `xpack.pnd.enabled` defaults to false (server/config.ts) and is only turned on
 * via config/kibana.dev.yml in interactive dev — Scout builds its own kbnTestServer
 * args and never reads that file, so without this config set the `pnd` app 404s
 * ("Application not found") under Scout even though the plugin compiles and its
 * routes register fine.
 *
 * Also injects preconfigured EIS `.inference` connectors from
 * `KIBANA_TESTING_AI_CONNECTORS` when set, so PND's worker workflows
 * (Watch Floor/Dark/Deep -> ai.agent) have a real model to call under Scout —
 * the `evals_tracing` config set does this but doesn't enable `pnd`, and PND's
 * eval suites need both simultaneously. Also points ES's
 * `xpack.inference.elastic.url` at the real EIS QA endpoint: preconfigured
 * `.inference` connectors are silently dropped from the connector list
 * (`filterInferenceConnectors` in the actions plugin) unless a matching ES
 * inference endpoint actually exists — the connector alone isn't enough.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet pnd
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      `xpack.inference.elastic.url=${EIS_QA_URL}`,
    ],
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.pnd.enabled=true',
      '--xpack.pnd.ui.useMockData=false',
      ...(preconfiguredEisConnectorsArg ? [preconfiguredEisConnectorsArg] : []),
    ],
  },
};
