/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Opt-in for the Fleet package registry docker container in local Scout runs: with
// `SCOUT_FLEET_PACKAGE_REGISTRY=true` and `FLEET_PACKAGE_REGISTRY_PORT`, the container is started
// and Kibana installs Fleet packages from it instead of the public EPR. The port alone is not
// enough: CI exports it for every job, and switching every lane is a separate decision.
import type { DockerServerSpec } from '@kbn/test-docker-servers';
import { packageRegistryDocker } from '@kbn/test-docker-servers';
import { createFailError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';

export const SCOUT_FLEET_PACKAGE_REGISTRY_ENV = 'SCOUT_FLEET_PACKAGE_REGISTRY';
export const FLEET_PACKAGE_REGISTRY_PORT_ENV = 'FLEET_PACKAGE_REGISTRY_PORT';

const TRUE_VALUES = ['1', 'true'];

export interface ScoutFleetPackageRegistry {
  /** Start the registry container and point Kibana at it. */
  enabled: boolean;
  /** Host port the container is published on; undefined when `FLEET_PACKAGE_REGISTRY_PORT` is unset. */
  port: number | undefined;
  /** Kibana server args that make Fleet use the container; empty when disabled. */
  kbnServerArgs: string[];
  /**
   * The `dockerServers.registry` entry for the base server configs: same image, registry config
   * file and readiness line as the FTR Fleet suites, enabled per the rule above.
   */
  dockerServer: DockerServerSpec;
  /**
   * Why the opt-in cannot be honoured (no port, or not a port number). Reported when the servers
   * start, through `assertFleetPackageRegistry`, so loading a config set never throws.
   */
  error?: string;
}

// the shared spec minus its own port-based `enabled`/`port`, which the rule above replaces
const { enabled: _enabledByPort, port: _portFromEnv, ...registrySpec } = packageRegistryDocker;

const registryDockerServer = (enabled: boolean, port: number | undefined): DockerServerSpec => ({
  ...registrySpec,
  enabled,
  port: port ?? 0,
  // the `:lite` image takes a while to load its manifests on first boot
  waitForLogLineTimeoutMs: 6 * 60 * 1000,
});

/** Reads the registry opt-in from the env: whether to start the container, the Kibana args and the docker spec. */
export function getFleetPackageRegistry(
  env: NodeJS.ProcessEnv = process.env
): ScoutFleetPackageRegistry {
  const rawPort = env[FLEET_PACKAGE_REGISTRY_PORT_ENV];
  const parsedPort = rawPort ? Number(rawPort) : undefined;
  const validPort =
    parsedPort !== undefined &&
    Number.isInteger(parsedPort) &&
    parsedPort > 0 &&
    parsedPort < 65536;
  const optIn = TRUE_VALUES.includes((env[SCOUT_FLEET_PACKAGE_REGISTRY_ENV] ?? '').toLowerCase());

  // Without the opt-in the port is informational only (CI exports it for every job), so a bad
  // value must not break runs that never asked for the registry. This runs at module load of the
  // base configs, which every config set imports, so it never throws: a misconfigured opt-in is
  // carried as `error` and reported when the servers start.
  if (!optIn) {
    const port = validPort ? parsedPort : undefined;
    return {
      enabled: false,
      port,
      kbnServerArgs: [],
      dockerServer: registryDockerServer(false, port),
    };
  }

  if (parsedPort === undefined || !validPort) {
    return {
      enabled: false,
      port: undefined,
      kbnServerArgs: [],
      dockerServer: registryDockerServer(false, undefined),
      error:
        parsedPort === undefined
          ? `${SCOUT_FLEET_PACKAGE_REGISTRY_ENV} is set but ${FLEET_PACKAGE_REGISTRY_PORT_ENV} is not: ` +
            'the package registry container needs a host port to publish on'
          : `${FLEET_PACKAGE_REGISTRY_PORT_ENV} must be a valid port number, got "${rawPort}"`,
    };
  }

  return {
    enabled: true,
    port: parsedPort,
    kbnServerArgs: [`--xpack.fleet.registryUrl=http://localhost:${parsedPort}`],
    dockerServer: registryDockerServer(true, parsedPort),
  };
}

/** Fails on an opt-in that cannot be honoured and says why the container is not started when only the port is set. */
export function assertFleetPackageRegistry(log: ToolingLog, env: NodeJS.ProcessEnv = process.env) {
  const registry = getFleetPackageRegistry(env);
  if (registry.error) {
    // a usage error: reported as such by the CLI, without a stack trace
    throw createFailError(registry.error);
  }
  if (env[FLEET_PACKAGE_REGISTRY_PORT_ENV] && !registry.enabled) {
    log.info(
      `scout: ${FLEET_PACKAGE_REGISTRY_PORT_ENV} is set but ${SCOUT_FLEET_PACKAGE_REGISTRY_ENV} is not; ` +
        'the Fleet package registry container is not started and Kibana installs packages from the public EPR'
    );
  }
}
