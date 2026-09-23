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
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import type { ScoutServerConfig } from '../../../../../types';
import { servers as tracing } from '../../evals_tracing/stateful/classic.stateful.config';

const createInvestigationConfig = (): ScoutServerConfig => {
  const concurrency = Number(process.env.NIGHTSHIFT_CONCURRENCY ?? 2);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 45) {
    throw new Error('NIGHTSHIFT_CONCURRENCY must be an integer between 1 and 45');
  }
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

  const exporterPrefix = '--telemetry.tracing.exporters=';
  const parentArgs = tracing.kbnTestServer.serverArgs;
  const exporterArg = parentArgs.find((arg) => arg.startsWith(exporterPrefix));
  const exporters: Array<{ http?: { url: string; headers?: Record<string, string> } }> = exporterArg
    ? JSON.parse(exporterArg.slice(exporterPrefix.length))
    : [];
  const telemetryUrl = process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL?.trim();
  const telemetryApiKey = process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY?.trim();
  const readableIndices = process.env.NIGHTSHIFT_SANDBOX_READABLE_INDICES;
  if ((telemetryUrl || telemetryApiKey || readableIndices) && !(telemetryUrl && telemetryApiKey)) {
    throw new Error(
      'Remote telemetry requires both NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL and NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY'
    );
  }
  const connectorPrefix = '--xpack.actions.preconfigured=';
  const connectorArg = parentArgs.find((arg) => arg.startsWith(connectorPrefix));

  // Keep sandbox, telemetry and trace-exporter credentials out of process arguments and logs.
  const configDirectory = mkdtempSync(join(tmpdir(), 'nightshift-evals-'));
  const removeConfigDirectory = () => rmSync(configDirectory, { recursive: true, force: true });
  process.once('exit', removeConfigDirectory);
  // A termination signal can end the process without an `exit` event: `signal-exit`, loaded through
  // the process runner, re-raises the signal when it is the only listener. Listening here both
  // cleans up and keeps it from doing that, so the CLI's own handler exits normally.
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.once(signal, () => {
      removeConfigDirectory();
      if (process.listenerCount(signal) === 0) process.kill(process.pid, signal);
    });
  }
  const sandboxConfig = {
    ...(exporterArg ? { 'telemetry.tracing.exporters': exporters } : {}),
    ...(telemetryUrl && telemetryApiKey
      ? {
          'xpack.actions.preconfigured': {
            ...(connectorArg ? JSON.parse(connectorArg.slice(connectorPrefix.length)) : {}),
            'nightshift-evals-telemetry': {
              name: 'Remote Elasticsearch telemetry',
              actionTypeId: '.webhook',
              config: { url: telemetryUrl, method: 'post', hasAuth: false, authType: null },
              secrets: { secretHeaders: { Authorization: `ApiKey ${telemetryApiKey}` } },
            },
          },
          'xpack.nightshift_investigations.sandbox': {
            telemetry_connector_id: 'nightshift-evals-telemetry',
            ...(readableIndices ? { telemetry_readable_indices: readableIndices } : {}),
          },
        }
      : {}),
    'xpack.sandbox': {
      enabled: true,
      host: process.env.SANDBOX_API_HOST ?? 'localhost',
      port: Number(process.env.SANDBOX_API_PORT ?? 9090),
      api_key: sandboxKey,
      ssl: {
        certificate: readFileSync(certificatePath, 'utf8'),
        key: readFileSync(keyPath, 'utf8'),
        ...(caPath ? { certificate_authorities: readFileSync(caPath, 'utf8') } : {}),
      },
    },
  };
  const sandboxConfigPath = join(configDirectory, 'sandbox.yml');
  writeFileSync(sandboxConfigPath, JSON.stringify(sandboxConfig), { mode: 0o600 });

  return {
    ...tracing,
    kbnTestServer: {
      ...tracing.kbnTestServer,
      serverArgs: [
        ...parentArgs.filter(
          (arg) =>
            !arg.startsWith(exporterPrefix) &&
            !(telemetryUrl && telemetryApiKey && arg.startsWith(connectorPrefix))
        ),
        '--xpack.nightshift_investigations.enabled=true',
        // Capacity counts normal-cost tasks, not raw cost units; reserve five background task slots.
        `--xpack.task_manager.capacity=${Math.max(10, concurrency + 5)}`,
        `--feature_flags.overrides.${NIGHTSHIFT_ENABLED_FLAG}=true`,
        '--xpack.nightshift_investigations.cortex.enabled=false',
        `--config=${sandboxConfigPath}`,
        '--uiSettings.overrides.workflows:ui:enabled=true',
        '--uiSettings.overrides.workflows:aiAgent:enabled=true',
        '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
        // The tracing config set already lifts the content redaction settings.
        '--uiSettings.overrides.agentBuilder:tracing:enabled=true',
        '--uiSettings.overrides.agentBuilder:tracing:includeUserData=true',
      ],
    },
  };
};

export const servers: ScoutServerConfig =
  process.env.NIGHTSHIFT_DATASETS === 'trace-only' ? createInvestigationConfig() : tracing;
