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

/** Reads PEM contents from `<name>` (e.g. the evals vault profile) or the file at `<name>_PATH`. */
const readPem = (name: string): string | undefined => {
  const contents = process.env[name];
  if (contents) return contents;
  const path = process.env[`${name}_PATH`];
  if (!path) return undefined;
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read ${name}_PATH (${path}): ${reason}`);
  }
};

/** Parses `SANDBOX_API_PORT` from the shell or profile, defaulting to sandbox-api's gRPC port. */
const readSandboxPort = (): number => {
  const raw = process.env.SANDBOX_API_PORT;
  if (!raw) return 9090;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`SANDBOX_API_PORT must be an integer between 1 and 65535, got "${raw}".`);
  }
  return port;
};

const createInvestigationConfig = (sandboxKey: string): ScoutServerConfig => {
  const certificate = readPem('SANDBOX_CLIENT_CERT');
  const key = readPem('SANDBOX_CLIENT_KEY');
  const certificateAuthorities = readPem('SANDBOX_CA_CERT');
  if (!certificate || !key) {
    throw new Error(
      'Sandbox-api mTLS needs SANDBOX_CLIENT_CERT and SANDBOX_CLIENT_KEY (PEM contents) or their *_PATH equivalents.'
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
    'xpack.sandbox': {
      enabled: true,
      host: process.env.SANDBOX_API_HOST || 'localhost',
      port: readSandboxPort(),
      api_key: sandboxKey,
      ssl: {
        certificate,
        key,
        ...(certificateAuthorities ? { certificate_authorities: certificateAuthorities } : {}),
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
        '--feature_flags.overrides.nightshift.enabled=true',
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

// Keyed on credentials alone, never NIGHTSHIFT_DATASETS: the CLI restarts Scout when SANDBOX_*
// changes but not when the selection does, and smoke runs on either server. The suite's Playwright
// config decides which evals run and rejects investigation selections without credentials.
const sandboxApiKey = process.env.SANDBOX_API_KEY;
export const servers: ScoutServerConfig = sandboxApiKey
  ? createInvestigationConfig(sandboxApiKey)
  : tracing;
