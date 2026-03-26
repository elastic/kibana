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
 * Cloud Security Posture package version to pre-install.
 * Update this value when upgrading the package version.
 */
export const CSPM_PACKAGE_VERSION = '3.1.2';

/**
 * Common server arguments for CSPM agentless tests.
 * These are shared between stateful and serverless configurations.
 */
export const cspmAgentlessServerArgs = [
  // Enable agentless integration in Fleet
  '--xpack.fleet.agentless.enabled=true',
  // Agentless API URL - requests will be intercepted by Playwright in tests
  '--xpack.fleet.agentless.api.url=http://localhost:8089',
  // Use test certificates (Fleet Agentless client always enables SSL)
  `--xpack.fleet.agentless.api.tls.certificate=${KBN_CERT_PATH}`,
  `--xpack.fleet.agentless.api.tls.key=${KBN_KEY_PATH}`,
  `--xpack.fleet.agentless.api.tls.ca=${CA_CERT_PATH}`,

  // Enable Fleet experimental features for agentless policy API
  `--xpack.fleet.enableExperimental=${JSON.stringify([
    'agentlessPoliciesAPI',
    'useAgentlessAPIInUI',
  ])}`,

  // Enable cloud connector feature flag in Security Solution
  '--uiSettings.overrides.securitySolution:enableCloudConnector=true',

  // Pre-install cloud_security_posture package at startup
  '--xpack.fleet.packages.0.name=cloud_security_posture',
  `--xpack.fleet.packages.0.version=${CSPM_PACKAGE_VERSION}`,

  // Enable debug logging for troubleshooting
  `--logging.loggers=${JSON.stringify([
    { name: 'plugins.fleet.agentless', level: 'debug' },
    { name: 'plugins.fleet.agentless_policies', level: 'debug' },
    { name: 'plugins.fleet.cloud_connectors', level: 'debug' },
  ])}`,
];
