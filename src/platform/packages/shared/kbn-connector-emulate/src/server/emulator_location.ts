/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

/** Environment variables that move the emulator, for the CLI and for what starts Kibana for it. */
export const EMULATOR_HOST_ENV = 'KBN_CONNECTOR_EMULATOR_HOST';
export const EMULATOR_PORT_ENV = 'KBN_CONNECTOR_EMULATOR_PORT';
export const EMULATOR_CA_DIR_ENV = 'KBN_CONNECTOR_EMULATOR_CA_DIR';

export const DEFAULT_EMULATOR_HOST = '127.0.0.1';
export const DEFAULT_EMULATOR_PORT = 5690;
/** Relative to the repository root. */
export const DEFAULT_EMULATOR_CA_DIRECTORY = path.join('data', 'connector_emulate');

export interface EmulatorLocation {
  readonly host: string;
  readonly port: number;
  /** What Kibana's `xpack.actions.proxyUrl` is set to. */
  readonly proxyUrl: string;
  /** Where the emulator keeps its CA, created on first use. */
  readonly caDirectory: string;
  /** The CA certificate Kibana has to trust, e.g. through `NODE_EXTRA_CA_CERTS`. */
  readonly caCertFile: string;
  readonly caKeyFile: string;
}

export const isPort = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= 65535;

/**
 * Where the emulator listens and keeps its CA: the defaults, moved by the environment variables
 * above. The `connector_emulate` script and the Scout config that starts Kibana against it both
 * ask here, so they agree. A port of 0 lets the emulator pick one, which a config can't know.
 */
export const resolveEmulatorLocation = ({
  repoRoot,
  env = process.env,
}: {
  readonly repoRoot: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}): EmulatorLocation => {
  const host = env[EMULATOR_HOST_ENV] || DEFAULT_EMULATOR_HOST;
  const port = env[EMULATOR_PORT_ENV] ? Number(env[EMULATOR_PORT_ENV]) : DEFAULT_EMULATOR_PORT;
  if (!isPort(port)) {
    throw new Error(`${EMULATOR_PORT_ENV} must be a port number, got ${env[EMULATOR_PORT_ENV]}`);
  }
  const caDirectory = path.resolve(
    repoRoot,
    env[EMULATOR_CA_DIR_ENV] || DEFAULT_EMULATOR_CA_DIRECTORY
  );
  return {
    host,
    port,
    proxyUrl: `http://${host.includes(':') ? `[${host}]` : host}:${port}`,
    caDirectory,
    caCertFile: path.join(caDirectory, 'ca.crt'),
    caKeyFile: path.join(caDirectory, 'ca.key'),
  };
};
