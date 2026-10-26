/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

/**
 * Exposed by the preboot test plugin in `test/plugins/test_endpoints`, which reads the verification
 * code interactive setup generated. Tests cannot read that file directly: its location depends on
 * the *running Kibana's* data path, which on CI is the built install directory rather than the repo
 * root the test process runs from.
 */
const VERIFICATION_CODE_ROUTE = '/test_endpoints/verification_code';

/**
 * Reads the verification code interactive setup generated for this Kibana boot. Every request to
 * `/internal/interactive_setup/{enroll,configure}` has to carry it, and it changes on every boot.
 */
export async function getVerificationCode(apiClient: ApiClientFixture): Promise<string> {
  const response = await apiClient.get(VERIFICATION_CODE_ROUTE);
  expect(response).toHaveStatusCode(200);

  return response.body.verificationCode;
}

/**
 * Waits for Kibana to finish rebooting after interactive setup wrote the Elasticsearch connection
 * to disk, then returns the status response for the caller to assert on.
 *
 * Until the reboot completes, `/api/status` either refuses the connection or is still served by
 * the preboot server, so both are treated as "not ready yet" rather than as failures.
 */
export async function waitForKibanaToBoot(
  apiClient: ApiClientFixture,
  timeoutMs: number
): Promise<ApiClientResponse> {
  await expect
    .poll(
      async () => {
        try {
          return (await apiClient.get('/api/status')).statusCode;
        } catch {
          return undefined;
        }
      },
      { timeout: timeoutMs }
    )
    .toBe(200);

  return apiClient.get('/api/status');
}
