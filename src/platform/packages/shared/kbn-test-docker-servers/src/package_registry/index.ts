/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';

// Docker image to use for Fleet API integration tests.
// This image comes from the latest successful build of https://buildkite.com/elastic/kibana-package-registry-promote
// which is promoted after acceptance tests succeed against docker.elastic.co/package-registry/distribution:lite
export const fleetPackageRegistryDockerImage =
  process.env.FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE ||
  'docker.elastic.co/kibana-ci/package-registry-distribution:lite';

const packageRegistryConfig = join(__dirname, './package_registry_config.yml');
const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];

/**
 * This is used by CI to set the docker registry port
 * you can also define this environment variable locally when running tests which
 * will spin up a local docker package registry locally for you
 * if this is defined it takes precedence over the `packageRegistryOverride` variable
 */
export const dockerRegistryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

export const packageRegistryDocker = {
  enabled: !!dockerRegistryPort,
  image: fleetPackageRegistryDockerImage,
  portInContainer: 8080,
  port: dockerRegistryPort,
  args: dockerArgs,
  waitForLogLine: 'package manifests loaded',
  waitForLogLineTimeoutMs: 60 * 4 * 1000, // 4 minutes
  preferCached: true,
};
