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
  'Fleet Outputs Management (local only)',
  { tag: ['@local-stateful-classic'] },
  () => {
    let outputId: string;

    apiTest.afterEach(async ({ apiServices }) => {
      // Clean up output
      if (outputId) {
        await apiServices.fleet.outputs.delete(outputId);
      }
      outputId = '';
    });

    apiTest('should get a specific output by ID', async ({ apiServices }) => {
      // First get all outputs to find an existing one
      const allOutputsResponse = await apiServices.fleet.outputs.getOutputs();
      const existingOutput = allOutputsResponse.data.items[0];

      // Only proceed if we have an existing output
      expect(existingOutput).toBeDefined();

      const response = await apiServices.fleet.outputs.getOutput(existingOutput.id);

      expect(response).toHaveStatusCode(200);
      expect(response.data.item.id).toBe(existingOutput.id);
    });
  }
);
