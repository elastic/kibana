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

import { ERROR_CONFIGURE_FAILURE, ERROR_OUTSIDE_PREBOOT_STAGE } from '../../../../common';
import {
  CONFIGURE_ROUTE,
  KIBANA_BOOT_TIMEOUT_MS,
  KIBANA_SYSTEM_USER,
  SETUP_SPEC_TIMEOUT_MS,
} from '../../../helpers/constants';
import { getVerificationCode, waitForKibanaToBoot } from '../../../helpers/setup_state';
import { getElasticsearchCaCertificate } from '../../../helpers/tls_tools';

apiTest.describe(
  'Interactive setup - manual configuration flow',
  { tag: ['@local-stateful-classic'] },
  () => {
    let verificationCode: string;
    let elasticsearchHost: string;
    let caCert: string;

    apiTest.beforeAll(async ({ apiClient, config }) => {
      verificationCode = await getVerificationCode(apiClient);
      elasticsearchHost = config.hosts.elasticsearch;

      // Read the CA off the live TLS chain rather than assuming a particular certificate, so the
      // spec stays correct whichever keystore the config set boots Elasticsearch with.
      const { hostname, port } = new URL(elasticsearchHost);
      caCert = (await getElasticsearchCaCertificate(hostname, port)).raw.toString('base64');
    });

    apiTest('rejects configuration with an invalid verification code', async ({ apiClient }) => {
      const response = await apiClient.post(CONFIGURE_ROUTE, {
        headers: { 'kbn-xsrf': 'xxx' },
        body: { host: elasticsearchHost, code: '000000', caCert, ...KIBANA_SYSTEM_USER },
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body).toStrictEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Forbidden',
      });
    });

    apiTest('rejects configuration with a corrupt CA certificate', async ({ apiClient }) => {
      const response = await apiClient.post(CONFIGURE_ROUTE, {
        headers: { 'kbn-xsrf': 'xxx' },
        body: {
          host: elasticsearchHost,
          code: verificationCode,
          caCert: caCert.split('').reverse().join(''),
          ...KIBANA_SYSTEM_USER,
        },
      });

      expect(response).toHaveStatusCode(500);
      expect(response.body).toStrictEqual({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to configure.',
        attributes: { type: ERROR_CONFIGURE_FAILURE },
      });
    });

    apiTest('rejects configuration with invalid credentials', async ({ apiClient }) => {
      const response = await apiClient.post(CONFIGURE_ROUTE, {
        headers: { 'kbn-xsrf': 'xxx' },
        body: {
          host: elasticsearchHost,
          code: verificationCode,
          caCert,
          ...KIBANA_SYSTEM_USER,
          password: 'no-way',
        },
      });

      expect(response).toHaveStatusCode(500);
      expect(response.body).toStrictEqual({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to configure.',
        attributes: { type: ERROR_CONFIGURE_FAILURE },
      });
    });

    // Must stay last: configuring ends the `preboot` stage and reboots Kibana, so any test declared
    // after this one would run against a Kibana that no longer serves the route.
    apiTest('configures Kibana, then refuses further requests and boots', async ({ apiClient }) => {
      apiTest.setTimeout(SETUP_SPEC_TIMEOUT_MS);

      const payload = {
        host: elasticsearchHost,
        code: verificationCode,
        caCert,
        ...KIBANA_SYSTEM_USER,
      };

      await apiTest.step('configuration is accepted', async () => {
        const response = await apiClient.post(CONFIGURE_ROUTE, {
          headers: { 'kbn-xsrf': 'xxx' },
          body: payload,
        });

        expect(response).toHaveStatusCode(204);
      });

      await apiTest.step('a second attempt is rejected as outside the preboot stage', async () => {
        const response = await apiClient.post(CONFIGURE_ROUTE, {
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
