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
 * The render route is triple-gated: it is only registered when
 * `xpack.fleet.iacProvisioner.enabled` is true, and the handler additionally
 * requires an agentless-capable (cloud/serverless) deployment. Serverless
 * satisfies the cloud gate on its own, so enabling agentless + the
 * iacProvisioner flag here is enough to exercise the route.
 *
 * No `iacProvisioner.api.url` is configured on purpose: the assertable tests
 * (schema 400s, unknown-package 404, privilege 403) never reach the outbound
 * provisioner call, and the live render path needs a real IaC Provisioner.
 */
export const iacProvisionerServerArgs = [
  '--xpack.fleet.agentless.enabled=true',
  '--xpack.fleet.iacProvisioner.enabled=true',
  `--logging.loggers=${JSON.stringify([
    { name: 'plugins.fleet.IacProvisionerService', level: 'debug' },
  ])}`,
];
