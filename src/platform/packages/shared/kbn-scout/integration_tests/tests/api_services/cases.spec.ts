/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CaseOwner } from '../../../src/playwright/fixtures/scope/worker/apis/cases';
import { apiTest, expect } from '../../../src/playwright';
import { createCasePayload } from '../../fixtures/constants';

apiTest.describe('Cases Helpers', { tag: ['@svlSecurity', '@ess'] }, () => {
  let caseId: string;
  let caseOwner: CaseOwner;

  apiTest.beforeEach(async ({ apiServices, config }) => {
    caseOwner =
      config.serverless && config.projectType === 'security' ? 'securitySolution' : 'cases';
    const createdResponse = await apiServices.cases.create({
      ...createCasePayload,
      owner: caseOwner,
      category: 'test',
    });
    expect(createdResponse.status).toBe(200);
    expect(createdResponse.data.owner).toBe(caseOwner);
    expect(createdResponse.data.status).toBe('open');
    caseId = createdResponse.data.id;
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.cases.cleanup.deleteAllCases();
    const fetchedResponse = await apiServices.cases.get(caseId);
    expect(fetchedResponse.status).toBe(404);
    caseId = '';
  });

  apiTest(`should fetch case with 'cases.get'`, async ({ apiServices }) => {
    const fetchedResponse = await apiServices.cases.get(caseId);
    expect(fetchedResponse.status).toBe(200);
  });

  apiTest(
    `should update case with a new severity with 'cases.update'`,
    async ({ apiServices, log }) => {
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
    }
  );

  apiTest('should add a new connector to a case', async ({ apiServices }) => {
    const currentCase = await apiServices.cases.get(caseId);

    // patch the case with a new connector
    const updatedResponse = await apiServices.cases.update([
      {
        id: caseId,
        version: currentCase.data.version,
        connector: {
          id: 'jira',
          name: 'Jira',
          type: '.jira',
          fields: { issueType: 'Task', priority: null, parent: null },
        },
      },
    ]);

    expect(updatedResponse.status).toBe(200);
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

    // delete all cases with tag "tag1"
    await apiServices.cases.cleanup.deleteCasesByTags(['tag1']);

    const fetchedResponse1 = await apiServices.cases.get(createdResponse1.data.id);
    const fetchedResponse2 = await apiServices.cases.get(createdResponse2.data.id);

    // this case should have been deleted because it was assigned "tag1"
    expect(fetchedResponse1.status).toBe(404);

    // this case shouldn't have been deleted because it was assigned "tag2"
    expect(fetchedResponse2.status).toBe(200);
  });

  apiTest('should post and find a comment', async ({ apiServices }) => {
    const createdComment = await apiServices.cases.comments.create(caseId, {
      type: 'user',
      comment: 'This is a test comment',
      owner: caseOwner,
    });

    expect(createdComment.status).toBe(200);
    expect(createdComment.data.totalComment).toBe(1);
    expect(createdComment.data.comments[0].comment).toBe('This is a test comment');

    // find comment by ID
    const commentId = createdComment.data.comments[0].id;
    const fetchedResponse = await apiServices.cases.comments.get(caseId, commentId);
    expect(fetchedResponse.status).toBe(200);
  });

  apiTest('should post an alert', async ({ apiServices }) => {
    const createdAlert = await apiServices.cases.comments.create(caseId, {
      type: 'alert',
      owner: caseOwner,
      alertId: 'test-alert-id',
      index: 'test-index',
      rule: { id: 'test-rule-id', name: 'test-rule-name' },
    });

    expect(createdAlert.status).toBe(200);
    expect(createdAlert.data.totalAlerts).toBe(1);
  });

  apiTest('should search for a case by category', async ({ apiServices }) => {
    const fetchedResponse = await apiServices.cases.find({ category: 'test' });
    expect(fetchedResponse.status).toBe(200);
    expect(fetchedResponse.data.total).toBe(1);
  });
});
