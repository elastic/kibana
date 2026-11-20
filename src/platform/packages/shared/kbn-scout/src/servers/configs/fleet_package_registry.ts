/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Opt-in for the Fleet package registry docker container in local Scout runs.
 *
 * The container is started by `runDockerServers` and Kibana is pointed at it through
 * `xpack.fleet.registryUrl`, so every Fleet package install goes to the image in
 * `FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE` (see `@kbn/test-docker-servers`) instead of the public
 * EPR. `FLEET_PACKAGE_REGISTRY_PORT` alone is not enough: CI exports it for every job, and
 * switching every Scout lane to the docker image is a separate decision. Set
 * `SCOUT_FLEET_PACKAGE_REGISTRY=true` as well, as the EPR image promotion pipeline does.
 */
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
}

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
  // base configs, i.e. for every Scout server start.
  if (!optIn) {
    return { enabled: false, port: validPort ? parsedPort : undefined, kbnServerArgs: [] };
  }

  if (parsedPort === undefined) {
    throw new Error(
      `${SCOUT_FLEET_PACKAGE_REGISTRY_ENV} is set but ${FLEET_PACKAGE_REGISTRY_PORT_ENV} is not: ` +
        'the package registry container needs a host port to publish on'
    );
  }

  if (!validPort) {
    throw new Error(
      `${FLEET_PACKAGE_REGISTRY_PORT_ENV} must be a valid port number, got "${rawPort}"`
    );
  }

  return {
    enabled: true,
    port: parsedPort,
    kbnServerArgs: [`--xpack.fleet.registryUrl=http://localhost:${parsedPort}`],
  };
}

/**
 * Before the docker servers start: say why the registry container is not going to run when the
 * port alone is set, since the port alone used to flip `dockerServers.registry.enabled` even
 * though nothing started the container.
 */
export function logFleetPackageRegistryHint(log: ToolingLog, env: NodeJS.ProcessEnv = process.env) {
  if (env[FLEET_PACKAGE_REGISTRY_PORT_ENV] && !getFleetPackageRegistry(env).enabled) {
    log.info(
      `scout: ${FLEET_PACKAGE_REGISTRY_PORT_ENV} is set but ${SCOUT_FLEET_PACKAGE_REGISTRY_ENV} is not; ` +
        'the Fleet package registry container is not started and Kibana installs packages from the public EPR'
    );
  }
}
