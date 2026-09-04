/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';

import {
  KIBANA_BOOT_TIMEOUT_MS,
  KIBANA_SYSTEM_USER,
  SETUP_COMPLETION_TIMEOUT_MS,
  SETUP_SPEC_TIMEOUT_MS,
} from '../../../helpers/constants';
import { getVerificationCode, waitForKibanaToBoot } from '../../../helpers/setup_state';
import { test } from '../fixtures';

test.describe(
  'Interactive setup - manual configuration',
  { tag: ["@local-stateful-classic"] },
  () => {
    test('configures Kibana against a TLS-enabled cluster', async ({
      pageObjects,
      apiClient,
      config,
    }) => {
      test.setTimeout(SETUP_SPEC_TIMEOUT_MS);

      const { interactiveSetup } = pageObjects;
      const verificationCode = await getVerificationCode(apiClient);

      await test.step('open the wizard and choose manual configuration', async () => {
        await interactiveSetup.goto(verificationCode);
        await interactiveSetup.configureManually();
      });

      await test.step('the cluster address is accepted', async () => {
        await interactiveSetup.checkClusterAddress(config.hosts.elasticsearch);
      });

      await test.step('a TLS-enabled cluster offers its certificate authority to trust', async () => {
        expect(await interactiveSetup.hasCaCertificateField()).toBe(true);
      });

      await test.step('submitting credentials and trusting the CA completes setup', async () => {
        await interactiveSetup.setCredentials(
          KIBANA_SYSTEM_USER.username,
          KIBANA_SYSTEM_USER.password
        );
        await interactiveSetup.trustCaCertificate();
        await interactiveSetup.submitConfiguration();
        await interactiveSetup.waitForSetupToComplete(SETUP_COMPLETION_TIMEOUT_MS);
      });

      await test.step('Kibana boots with the new configuration', async () => {
        const status = await waitForKibanaToBoot(apiClient, KIBANA_BOOT_TIMEOUT_MS);

        expect(Object.keys(status.body)).toContain('version');
        expect(Object.keys(status.body)).toContain('status');
      });
    });
  }
);
