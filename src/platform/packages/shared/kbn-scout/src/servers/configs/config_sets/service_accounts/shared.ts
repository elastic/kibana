/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Service accounts are off by default, so they need their own config set: the shared
 * configurations cannot reach the feature at all. The test plugin exposes the workload API
 * (bind, unbind, run as the bound account) over HTTP for the security plugin's suites.
 */
export const serviceAccountsServerArgs = [
  '--xpack.security.serviceAccounts.enabled=true',
  `--plugin-path=${resolve(
    REPO_ROOT,
    'x-pack/platform/test/security_api_integration/plugins/service_accounts'
  )}`,
];

/**
 * UIAM's shortest allowed lifetime for service account exchange tokens, so a test can outlive one
 * and check that Kibana renews it.
 */
export const serviceAccountsUiamEphemeralTokenExpiration = 'PT1M';
