/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Server arguments that turn on the Fleet IaC Provisioner render flow.
 *
 * The render route is always registered. The handler requires an
 * agentless-capable (cloud/serverless) deployment and the
 * `fleet.enableIacProvisioner` LaunchDarkly flag (set in the spec via
 * `feature_flags.overrides`). Serverless satisfies the cloud gate on its own,
 * so enabling agentless here is enough for the environment check.
 *
 * No `iacProvisioner.api.url` is configured on purpose: the assertable tests
 * (schema 400s, unknown-package 404, privilege 403) never reach the outbound
 * provisioner call, and the live render path needs a real IaC Provisioner.
 */
export const iacProvisionerServerArgs = [
  '--xpack.fleet.agentless.enabled=true',
  `--logging.loggers=${JSON.stringify([
    { name: 'plugins.fleet.IacProvisionerService', level: 'debug' },
  ])}`,
];
