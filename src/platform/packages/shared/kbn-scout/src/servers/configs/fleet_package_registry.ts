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
  const port = rawPort ? Number(rawPort) : undefined;
  const optIn = TRUE_VALUES.includes((env[SCOUT_FLEET_PACKAGE_REGISTRY_ENV] ?? '').toLowerCase());

  if (port !== undefined && !(Number.isInteger(port) && port > 0 && port < 65536)) {
    throw new Error(
      `${FLEET_PACKAGE_REGISTRY_PORT_ENV} must be a valid port number, got "${rawPort}"`
    );
  }

  if (optIn && port === undefined) {
    throw new Error(
      `${SCOUT_FLEET_PACKAGE_REGISTRY_ENV} is set but ${FLEET_PACKAGE_REGISTRY_PORT_ENV} is not: ` +
        'the package registry container needs a host port to publish on'
    );
  }

  const enabled = optIn && port !== undefined;

  return {
    enabled,
    port,
    kbnServerArgs: enabled ? [`--xpack.fleet.registryUrl=http://localhost:${port}`] : [],
  };
}

export const fleetPackageRegistry = getFleetPackageRegistry();
