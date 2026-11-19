/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags } from '../../../../../src/playwright';
import { expect } from '../../../../../api';

apiTest.describe('Fleet Outputs Management', { tag: [...tags.stateful.classic] }, () => {
  let outputId: string;

  apiTest.afterEach(async ({ apiServices }) => {
    // Clean up output
    if (outputId) {
      await apiServices.fleet.outputs.delete(outputId);
    }
    outputId = '';
  });

  apiTest('should get all outputs', async ({ apiServices }) => {
    const response = await apiServices.fleet.outputs.getOutputs();

    expect(response).toHaveStatusCode(200);
    expect(response.data).toBeDefined();
    expect(response.data.items).toBeDefined();
  });

  apiTest('should create an output with additional parameters', async ({ apiServices }) => {
    const outputName = `test-output-params-${Date.now()}`;
    const outputHosts = ['https://localhost:9200'];

    const response = await apiServices.fleet.outputs.create(
      outputName,
      outputHosts,
      'elasticsearch',
      {
        is_default: false,
        ca_trusted_fingerprint: 'test-fingerprint',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.data.item.name).toBe(outputName);
    expect(response.data.item.is_default).toBe(false);

    outputId = response.data.item.id;
  });

  apiTest('should delete an output', async ({ apiServices }) => {
    const outputName = `test-output-delete-${Date.now()}`;

    // First create an output
    const createResponse = await apiServices.fleet.outputs.create(
      outputName,
      ['https://localhost:9200'],
      'elasticsearch'
    );
    const deleteOutputId = createResponse.data.item.id;

    // Then delete it
    const response = await apiServices.fleet.outputs.delete(deleteOutputId);

    expect(response).toHaveStatusCode(200);
    // Don't set outputId since we already deleted it
  });
});
