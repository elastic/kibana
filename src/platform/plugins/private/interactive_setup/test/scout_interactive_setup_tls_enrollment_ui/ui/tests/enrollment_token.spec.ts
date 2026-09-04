/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { kibanaPackageJson } from '@kbn/repo-info';
import { expect } from '@kbn/scout/ui';

import {
  ENROLLMENT_API_KEY_NAME,
  KIBANA_BOOT_TIMEOUT_MS,
  SETUP_COMPLETION_TIMEOUT_MS,
  SETUP_SPEC_TIMEOUT_MS,
} from '../../../helpers/constants';
import { getVerificationCode, waitForKibanaToBoot } from '../../../helpers/setup_state';
import { getElasticsearchCaCertificate } from '../../../helpers/tls_tools';
import { test } from '../fixtures';

/**
 * The enrollment-token flow: the landing screen of the wizard takes a single base64 token that
 * bundles the Kibana version, the cluster's address, its CA fingerprint, and an Elasticsearch API
 * key — the same token `elasticsearch-create-enrollment-token` prints.
 *
 * There is deliberately no `browserAuth` call. Kibana is held in the `preboot` stage with no
 * security, so there is nobody to log in as; Scout's `page` fixture is independent of `browserAuth`
 * and gives an unauthenticated page by default. The `elastic` credentials behind `esClient` are
 * only used to mint the API key the token carries.
 */
test.describe('Interactive setup - enrollment token', { tag: ["@local-stateful-classic"] }, () => {
  let enrollmentApiKey: string;

  test.beforeEach(async ({ esClient }) => {
    const apiKey = await esClient.security.createApiKey({ name: ENROLLMENT_API_KEY_NAME });
    // Unlike the enroll API, which takes an already-base64 `apiKey` field, the token embeds the
    // raw `id:api_key` pair and is base64-encoded as a whole.
    enrollmentApiKey = `${apiKey.id}:${apiKey.api_key}`;
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.security.invalidateApiKey({ name: ENROLLMENT_API_KEY_NAME });
  });

  test('configures Kibana from an enrollment token', async ({ pageObjects, apiClient, config }) => {
    test.setTimeout(SETUP_SPEC_TIMEOUT_MS);

    const { interactiveSetup } = pageObjects;
    const verificationCode = await getVerificationCode(apiClient);

    const { hostname, port } = new URL(config.hosts.elasticsearch);
    // Read the CA off the live TLS chain rather than assuming a particular certificate. The token
    // carries the fingerprint lower-cased and colon-free, which is the form Kibana compares.
    const caFingerprint = (await getElasticsearchCaCertificate(hostname, port)).fingerprint256
      .replace(/:/g, '')
      .toLowerCase();

    const enrollmentToken = Buffer.from(
      JSON.stringify({
        ver: kibanaPackageJson.version,
        adr: [`${hostname}:${port}`],
        fgr: caFingerprint,
        key: enrollmentApiKey,
      }),
      'binary'
    ).toString('base64');

    await test.step('open the wizard', async () => {
      await interactiveSetup.goto(verificationCode);
    });

    await test.step('submitting the token completes setup and leaves the wizard', async () => {
      await interactiveSetup.submitEnrollmentToken(enrollmentToken);
      await interactiveSetup.waitForSetupToComplete(SETUP_COMPLETION_TIMEOUT_MS);
    });

    await test.step('Kibana boots with the new configuration', async () => {
      const status = await waitForKibanaToBoot(apiClient, KIBANA_BOOT_TIMEOUT_MS);

      expect(Object.keys(status.body)).toContain('version');
      expect(Object.keys(status.body)).toContain('status');
    });
  });
});
