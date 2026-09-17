/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ScoutServerConfig } from '../../../../../types';
import { servers as tracing } from '../../evals_tracing/stateful/classic.stateful.config';
import { createTelemetryIdentity } from './create_telemetry_identity';

const sandboxKey = process.env.SANDBOX_API_KEY;
if (!sandboxKey)
  throw new Error(
    'SANDBOX_API_KEY is required; start the external sandbox-api before running Nightshift evals.'
  );

const certificatePath = process.env.SANDBOX_CLIENT_CERT_PATH;
const keyPath = process.env.SANDBOX_CLIENT_KEY_PATH;
const caPath = process.env.SANDBOX_CA_CERT_PATH;
if (!certificatePath || !keyPath) {
  throw new Error(
    'SANDBOX_CLIENT_CERT_PATH and SANDBOX_CLIENT_KEY_PATH are required for sandbox-api mTLS.'
  );
}

const connectorPrefix = '--xpack.actions.preconfigured=';
const exporterPrefix = '--telemetry.tracing.exporters=';
const parentArgs = tracing.kbnTestServer.serverArgs;
const connectorArg = parentArgs.find((arg) => arg.startsWith(connectorPrefix));
const connectors: Record<string, object> = connectorArg
  ? JSON.parse(connectorArg.slice(connectorPrefix.length))
  : {};
const exporterArg = parentArgs.find((arg) => arg.startsWith(exporterPrefix));
const exporters: Array<{ http?: { url: string; headers?: Record<string, string> } }> = exporterArg
  ? JSON.parse(exporterArg.slice(exporterPrefix.length))
  : [];

// Keep sandbox and telemetry credentials out of process arguments and launcher logs.
const configDirectory = mkdtempSync(join(tmpdir(), 'nightshift-evals-'));
process.once('exit', () => rmSync(configDirectory, { recursive: true, force: true }));
const telemetry = createTelemetryIdentity(configDirectory, tracing.esTestCluster.files);
const sandboxConfig = {
  'xpack.actions.preconfigured': {
    ...connectors,
    'nightshift-evals-telemetry': {
      name: 'Scout Elasticsearch telemetry',
      actionTypeId: '.webhook',
      config: {
        url:
          process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL ??
          `http://host.docker.internal:${tracing.servers.elasticsearch.port}`,
        method: 'post',
        hasAuth: true,
      },
      secrets: {
        user: telemetry.username,
        password: telemetry.password,
      },
    },
  },
  'xpack.nightshift_investigations.sandbox': {
    host: process.env.SANDBOX_API_HOST ?? 'localhost',
    port: Number(process.env.SANDBOX_API_PORT ?? 9090),
    api_key: sandboxKey,
    ssl: {
      certificate: readFileSync(certificatePath, 'utf8'),
      key: readFileSync(keyPath, 'utf8'),
      ...(caPath ? { certificate_authorities: readFileSync(caPath, 'utf8') } : {}),
    },
    telemetry_connector_id: 'nightshift-evals-telemetry',
  },
};
const sandboxConfigPath = join(configDirectory, 'sandbox.yml');
writeFileSync(sandboxConfigPath, JSON.stringify(sandboxConfig), { mode: 0o600 });

export const servers: ScoutServerConfig = {
  ...tracing,
  esTestCluster: { ...tracing.esTestCluster, files: telemetry.files },
  kbnTestServer: {
    ...tracing.kbnTestServer,
    serverArgs: [
      ...parentArgs.filter((arg) => !arg.startsWith(connectorPrefix)),
      '--xpack.nightshift_investigations.enabled=true',
      '--xpack.nightshift_investigations.cortex.enabled=false',
      `--config=${sandboxConfigPath}`,
      `--xpack.agentBuilder.tracing.exporters=${JSON.stringify(
        exporters.flatMap(({ http }) => (http ? [http] : []))
      )}`,
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      ...[
        'enabled',
        'includeUserPrompts',
        'includeSystemPrompt',
        'includeLlmResponses',
        'includeToolDetails',
        'includeRealNames',
        'includeRealIds',
        'includeUserData',
      ].map((setting) => `--uiSettings.overrides.agentBuilder:tracing:${setting}=true`),
    ],
  },
};
