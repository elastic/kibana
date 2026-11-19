/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';

/**
 * AWS package version to pre-install, pinned so the suite is deterministic —
 * the visibility tests assert against this version's manifest (var_groups,
 * hide_in_deployment_modes). Bump deliberately when adopting a new aws release.
 * Identity Federation shipped in aws 8.0.0 (elastic/integrations#20527).
 */
export const AWS_PACKAGE_VERSION = '8.1.0';

/**
 * Common server arguments for Fleet Identity Federation agentless tests.
 *
 * These enable:
 * - Fleet agentless integration (with a local mock URL)
 * - The `cloud_connectors` experimental feature flag
 * - The `identity_federation` var_group option (via securitySolution:enableCloudConnector)
 * - Pre-installed `aws` package so add-integration navigations work offline
 *
 * Tests use Playwright page.route() to intercept /api/fleet/cloud_connectors and
 * /api/fleet/managed_integrations — no real agentless controller is called.
 */
export const fiAgentlessServerArgs = [
  // Enable agentless integration in Fleet
  '--xpack.fleet.agentless.enabled=true',
  // Agentless API URL — requests intercepted by Playwright in tests
  '--xpack.fleet.agentless.api.url=http://localhost:8089',
  // TLS certificates required by the Fleet agentless client
  `--xpack.fleet.agentless.api.tls.certificate=${KBN_CERT_PATH}`,
  `--xpack.fleet.agentless.api.tls.key=${KBN_KEY_PATH}`,
  `--xpack.fleet.agentless.api.tls.ca=${CA_CERT_PATH}`,

  // Enable Fleet experimental features for agentless policy API and cloud connectors
  `--xpack.fleet.enableExperimental=${JSON.stringify([
    'agentlessPoliciesAPI',
    'useAgentlessAPIInUI',
    'cloud_connectors',
  ])}`,

  // Enable cloud connector feature flag in Security Solution (controls FI option rendering)
  '--uiSettings.overrides.securitySolution:enableCloudConnector=true',

  // Pre-install the aws package so add-integration pages load without an internet call
  '--xpack.fleet.packages.0.name=aws',
  `--xpack.fleet.packages.0.version=${AWS_PACKAGE_VERSION}`,

  // Debug logging for troubleshooting agentless and cloud connector flows
  `--logging.loggers=${JSON.stringify([
    { name: 'plugins.fleet.agentless', level: 'debug' },
    { name: 'plugins.fleet.cloud_connectors', level: 'debug' },
  ])}`,
];
