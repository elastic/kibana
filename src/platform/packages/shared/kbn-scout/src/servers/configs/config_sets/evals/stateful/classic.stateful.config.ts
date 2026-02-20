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

/**
 * Scout server configuration for @kbn/evals CI.
 *
 * Includes the Elastic Inference Service (EIS) URL so the test ES cluster can
 * enable Cloud Connected Mode (CCM) and provision EIS-backed inference endpoints.
 */

const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';

type AvailableConnector = {
  name: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets?: Record<string, unknown>;
};

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
    eisConnectors[id] = connector;
  }

  if (Object.keys(eisConnectors).length === 0) return;

  return `--xpack.actions.preconfigured=${JSON.stringify(eisConnectors)}`;
}

const preconfiguredEisConnectorsArg = getPreconfiguredEisConnectorsArg();

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
      ...(preconfiguredEisConnectorsArg ? [preconfiguredEisConnectorsArg] : []),
    ],
  },
};
