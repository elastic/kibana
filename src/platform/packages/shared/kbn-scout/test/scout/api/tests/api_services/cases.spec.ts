/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest } from '../../../../../src/playwright';
import { createCasePayload } from '../../../fixtures/constants';
import { expect } from '../../../../../api';

apiTest.describe('Cases Helpers', { tag: ['@svlSecurity', '@ess'] }, () => {
  let caseId: string;
  let caseOwner = '';
  apiTest.beforeEach(async ({ apiServices, config }) => {
    caseOwner =
      config.serverless && config.projectType === 'security' ? 'securitySolution' : 'cases';
    const createdResponse = await apiServices.cases.create({
      ...createCasePayload,
      owner: caseOwner,
    });
    expect(createdResponse).toHaveStatusCode(200);
    expect(createdResponse.data.owner).toBe(caseOwner);
    expect(createdResponse.data.status).toBe('open');
    caseId = createdResponse.data.id;
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.cases.delete([caseId]);
    const fetchedResponse = await apiServices.cases.get(caseId);
    expect(fetchedResponse).toHaveStatusCode(404);
    caseId = '';
  });

  apiTest(`should fetch case with 'cases.get'`, async ({ apiServices }) => {
    const fetchedResponse = await apiServices.cases.get(caseId);
    expect(fetchedResponse).toHaveStatusCode(200);
  });

  apiTest(`should update case with 'cases.update'`, async ({ apiServices }) => {
    // First get the case to obtain its current version
    const currentCase = await apiServices.cases.get(caseId);

    const updatedResponse = await apiServices.cases.update([
      {
        id: caseId,
        version: currentCase.data.version,
        severity: 'medium',
      },
    ]);
    expect(updatedResponse).toHaveStatusCode(200);
    expect(updatedResponse.data).toHaveLength(1);
    expect(updatedResponse.data[0].severity).toBe('medium');
  });
});
