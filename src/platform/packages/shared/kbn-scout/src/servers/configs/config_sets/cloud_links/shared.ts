/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const trialEndDate = new Date(Date.now());
trialEndDate.setMonth(trialEndDate.getMonth() + 1);

/**
 * Common server arguments for Cloud Links integration tests.
 *
 * The cloud.id value encodes the ES endpoint used by connection-details assertions:
 *   ftr_fake_cloud_id:<base64(hello.com:443$ES123abc$kbn123abc)>
 * → ES URL: https://ES123abc.hello.com:443
 * → Cloud ID: ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM=
 *
 * xpack.product_intercept.enabled is required for trial_product_intercepts tests.
 * The timer is advanced via localStorage in tests (no short interval flag needed).
 */
export const cloudLinksServerArgs = [
  // Override base cloud.id — the base64 suffix encodes ES endpoint for test assertions
  '--xpack.cloud.id=ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM=',
  '--xpack.cloud.base_url=https://cloud.elastic.co',
  '--xpack.cloud.deployment_url=/deployments/deploymentId',
  '--xpack.cloud.organization_url=/organization/organizationId',
  '--xpack.cloud.billing_url=/billing',
  '--xpack.cloud.profile_url=/user/userId',
  // Enable trial product intercepts (timer triggered via localStorage in tests, not via short interval)
  '--xpack.product_intercept.enabled=true',
  `--xpack.cloud.trial_end_date=${trialEndDate.toISOString()}`,
  // Allow the standard saved objects HTTP API to access hiddenFromHttpApis types (e.g. 'cloud').
  '--savedObjects.allowHttpApiAccess=true',
];
