/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest } from '../../../../../src/playwright';
import { expect } from '../../../../../api';

apiTest.describe(
  'Fleet Server Hosts Management',
  { tag: ['@local-stateful-classic', '@local-serverless-security_complete'] },
  () => {
    let hostId: string;

    apiTest.afterEach(async ({ apiServices }) => {
      // Clean up host
      if (hostId) {
        await apiServices.fleet.server_hosts.delete(hostId);
        // Host might not exist or already deleted
        hostId = '';
      }
    });

    apiTest('should get fleet server hosts', async ({ apiServices }) => {
      // Note: The get method doesn't return a value in current implementation
      // This test verifies it doesn't throw an error
      const resp = await apiServices.fleet.server_hosts.get();
      expect(resp).toHaveStatusCode(200);
    });

    apiTest('should create a fleet server host with parameters', async ({ apiServices }) => {
      const hostName = `test-fleet-server-params-${Date.now()}`;
      const hostUrls = ['https://localhost:8220'];

      const response = await apiServices.fleet.server_hosts.create(hostName, hostUrls, {
        is_default: false,
        is_internal: true,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.data.item.name).toBe(hostName);
      expect(response.data.item.is_default).toBe(false);
      expect(response.data.item.is_internal).toBe(true);

      hostId = response.data.item.id;
    });

    apiTest('should delete a fleet server host', async ({ apiServices }) => {
      const hostName = `test-fleet-server-delete-${Date.now()}`;

      // First create a fleet server host
      const createResponse = await apiServices.fleet.server_hosts.create(hostName, [
        'https://localhost:8220',
      ]);
      const deleteHostId = createResponse.data.item.id;

      // Then delete it
      const response = await apiServices.fleet.server_hosts.delete(deleteHostId);

      expect(response).toHaveStatusCode(200);
      // Don't set hostId since we already deleted it
    });
  }
);
