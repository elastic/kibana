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

const createInvestigationConfig = (): ScoutServerConfig => {
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

  // Keep sandbox and trace-exporter credentials out of process arguments and logs.
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
    'xpack.agentBuilder.tracing.exporters': exporters.flatMap(({ http }) => (http ? [http] : [])),
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
        ...parentArgs.filter((arg) => !arg.startsWith(exporterPrefix)),
        '--xpack.nightshift_investigations.enabled=true',
        '--feature_flags.overrides.streams.significantEventsAvailable=true',
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
