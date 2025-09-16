/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, expect } from '../../../src/playwright';
import { createCasePayload } from '../../fixtures/constants';

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
    expect(createdResponse.status).toBe(200);
    expect(createdResponse.data.owner).toBe(caseOwner);
    expect(createdResponse.data.status).toBe('open');
    caseId = createdResponse.data.id;
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.cases.delete([caseId]);
    const fetchedResponse = await apiServices.cases.get(caseId);
    expect(fetchedResponse.status).toBe(404);
    caseId = '';
  });

  apiTest(`should fetch case with 'cases.get'`, async ({ apiServices }) => {
    const fetchedResponse = await apiServices.cases.get(caseId);
    expect(fetchedResponse.status).toBe(200);
  });

  apiTest(`should update case with 'cases.update'`, async ({ apiServices, log }) => {
    // First get the case to obtain its current version
    const currentCase = await apiServices.cases.get(caseId);

    const updatedResponse = await apiServices.cases.update([
      {
        id: caseId,
        version: currentCase.data.version,
        severity: 'medium',
      },
    ]);
    expect(updatedResponse.status).toBe(200);
    expect(updatedResponse.data.length).toBe(1);
    expect(updatedResponse.data[0].severity).toBe('medium');
  });

  apiTest('should delete multiple cases', async ({ apiServices }) => {
    const createdResponse1 = await apiServices.cases.create({
      ...createCasePayload,
      owner: caseOwner,
    });
    const createdResponse2 = await apiServices.cases.create({
      ...createCasePayload,
      owner: caseOwner,
    });
    expect(createdResponse1.status).toBe(200);
    expect(createdResponse2.status).toBe(200);

    await apiServices.cases.cleanup.deleteAllCases();

    const fetchedResponse1 = await apiServices.cases.get(createdResponse1.data.id);
    const fetchedResponse2 = await apiServices.cases.get(createdResponse2.data.id);
    expect(fetchedResponse1.status).toBe(404);
    expect(fetchedResponse2.status).toBe(404);
  });

  apiTest('should delete cases by tags', async ({ apiServices }) => {
    const createdResponse1 = await apiServices.cases.create({
      ...createCasePayload,
      owner: caseOwner,
      tags: ['tag1'],
    });
    const createdResponse2 = await apiServices.cases.create({
      ...createCasePayload,
      owner: caseOwner,
      tags: ['tag2'],
    });
    expect(createdResponse1.status).toBe(200);
    expect(createdResponse2.status).toBe(200);

    await apiServices.cases.cleanup.deleteCasesByTags(['tag1']);

    const fetchedResponse1 = await apiServices.cases.get(createdResponse1.data.id);
    const fetchedResponse2 = await apiServices.cases.get(createdResponse2.data.id);

    // this case should have been deleted because it had "tag1"
    expect(fetchedResponse1.status).toBe(404);

    // this case should have been deleted because it had "tag2"
    expect(fetchedResponse2.status).toBe(200);
  });
});
