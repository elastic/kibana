/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ERROR_ENROLL_FAILURE, ERROR_OUTSIDE_PREBOOT_STAGE } from '../../../../common';
import {
  ENROLLMENT_API_KEY_NAME,
  KIBANA_BOOT_TIMEOUT_MS,
  SETUP_SPEC_TIMEOUT_MS,
} from '../../../helpers/constants';
import { getVerificationCode, waitForKibanaToBoot } from '../../../helpers/setup_state';
import { getElasticsearchCaCertificate } from '../../../helpers/tls_tools';

const ENROLL_ROUTE = '/internal/interactive_setup/enroll';

/** A CA fingerprint that is well-formed but belongs to no cluster we talk to. */
const UNRELATED_CA_FINGERPRINT = '3FDAEE71A3604070E6AE6B01412D19772DE5AE129F69C413F0453B293D9BE65D';

/**
 * Enrollment against a TLS-enabled cluster with `xpack.security.enrollment.enabled`. Enrolling
 * proves possession of three things at once: the verification code Kibana printed, an Elasticsearch
 * API key, and the cluster's CA fingerprint.
 *
 * These tests are not independent, and cannot be made so: they share one Kibana held in the
 * `preboot` stage, and the last one enrolls it, which reboots Kibana and closes the endpoint for
 * good. Ordering is therefore load-bearing — Playwright runs tests in declaration order within a
 * file, and Scout's defaults (`workers: 1`, `fullyParallel: false`) keep it that way.
 *
 * The routes are unauthenticated by design (`authc.enabled: false`): in `preboot` there is no
 * security and nobody to authenticate as, so `apiClient` is used without any auth fixture. The
 * `elastic` credentials behind `esClient` are only used to mint the API key the payload carries.
 */
apiTest.describe(
  'Interactive setup - enrollment flow',
  { tag: ["@local-stateful-classic"] },
  () => {
    let verificationCode: string;
    let caFingerprint: string;
    let elasticsearchHost: string;
    let enrollmentApiKey: string;

    apiTest.beforeAll(async ({ apiClient, config }) => {
      verificationCode = await getVerificationCode(apiClient);
      elasticsearchHost = config.hosts.elasticsearch;

      // Read the CA off the live TLS chain rather than assuming a particular certificate, so the
      // spec stays correct whichever keystore the config set boots Elasticsearch with.
      const { hostname, port } = new URL(elasticsearchHost);
      caFingerprint = (await getElasticsearchCaCertificate(hostname, port)).fingerprint256.replace(
        /:/g,
        ''
      );
    });

    apiTest.beforeEach(async ({ esClient }) => {
      const apiKey = await esClient.security.createApiKey({ name: ENROLLMENT_API_KEY_NAME });
      enrollmentApiKey = Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64');
    });

    apiTest.afterEach(async ({ esClient }) => {
      await esClient.security.invalidateApiKey({ name: ENROLLMENT_API_KEY_NAME });
    });

    apiTest('rejects enrollment with an invalid verification code', async ({ apiClient }) => {
      const response = await apiClient.post(ENROLL_ROUTE, {
        headers: { 'kbn-xsrf': 'xxx' },
        body: {
          apiKey: enrollmentApiKey,
          code: '000000',
          caFingerprint,
          hosts: [elasticsearchHost],
        },
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body).toStrictEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Forbidden',
      });
    });

    apiTest('rejects enrollment with a mismatched CA fingerprint', async ({ apiClient }) => {
      const response = await apiClient.post(ENROLL_ROUTE, {
        headers: { 'kbn-xsrf': 'xxx' },
        body: {
          apiKey: enrollmentApiKey,
          code: verificationCode,
          caFingerprint: UNRELATED_CA_FINGERPRINT,
          hosts: [elasticsearchHost],
        },
      });

      expect(response).toHaveStatusCode(500);
      expect(response.body).toStrictEqual({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to enroll.',
        attributes: { type: ERROR_ENROLL_FAILURE },
      });
    });

    apiTest('rejects enrollment with an invalidated API key', async ({ apiClient, esClient }) => {
      // Invalidating here — rather than passing a bogus key — is the point of the test: the key
      // was genuinely issued, so only Elasticsearch rejecting it can make the enrollment fail.
      // `afterEach` then invalidates again, which is a harmless no-op.
      await esClient.security.invalidateApiKey({ name: ENROLLMENT_API_KEY_NAME });

      const response = await apiClient.post(ENROLL_ROUTE, {
        headers: { 'kbn-xsrf': 'xxx' },
        body: {
          apiKey: enrollmentApiKey,
          code: verificationCode,
          caFingerprint,
          hosts: [elasticsearchHost],
        },
      });

      expect(response).toHaveStatusCode(500);
      expect(response.body).toStrictEqual({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to enroll.',
        attributes: { type: ERROR_ENROLL_FAILURE },
      });
    });

    // Must stay last: enrolling ends the `preboot` stage and reboots Kibana, so any test declared
    // after this one would run against a Kibana that no longer serves the route.
    apiTest('enrolls Kibana, then refuses further requests and boots', async ({ apiClient }) => {
      apiTest.setTimeout(SETUP_SPEC_TIMEOUT_MS);

      const payload = {
        apiKey: enrollmentApiKey,
        code: verificationCode,
        caFingerprint,
        hosts: [elasticsearchHost],
      };

      await apiTest.step('enrollment is accepted', async () => {
        const response = await apiClient.post(ENROLL_ROUTE, {
          headers: { 'kbn-xsrf': 'xxx' },
          body: payload,
        });

        expect(response).toHaveStatusCode(204);
      });

      await apiTest.step('a second attempt is rejected as outside the preboot stage', async () => {
        const response = await apiClient.post(ENROLL_ROUTE, {
          headers: { 'kbn-xsrf': 'xxx' },
          body: payload,
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body).toStrictEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Cannot process request outside of preboot stage.',
          attributes: { type: ERROR_OUTSIDE_PREBOOT_STAGE },
        });
      });

      await apiTest.step('Kibana boots with the new configuration', async () => {
        const status = await waitForKibanaToBoot(apiClient, KIBANA_BOOT_TIMEOUT_MS);

        expect(status).toHaveStatusCode(200);
        expect(Object.keys(status.body)).toContain('version');
        expect(Object.keys(status.body)).toContain('status');
      });
    });
  }
);
