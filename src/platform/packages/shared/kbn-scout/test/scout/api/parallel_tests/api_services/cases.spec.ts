/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags } from '../../../../../src/playwright';
import { createCasePayload } from '../../../fixtures/constants';
import { expect } from '../../../../../api';

apiTest.describe(
  'Cases Helpers',
  { tag: [...tags.serverless.security.complete, ...tags.stateful.classic] },
  () => {
    let caseId: string;
    let caseOwner: 'cases' | 'observability' | 'securitySolution';

    apiTest.beforeEach(async ({ apiServices, config }) => {
      caseOwner =
        config.serverless && config.projectType === 'security' ? 'securitySolution' : 'cases';
      const response = await apiServices.cases.create({
        ...createCasePayload,
        owner: caseOwner,
        category: 'test',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.data.owner).toBe(caseOwner);
      expect(response.data.status).toBe('open');
      caseId = response.data.id;
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.cases.cleanup.deleteAllCases();
      const fetchedResponse = await apiServices.cases.get(caseId);
      expect(fetchedResponse).toHaveStatusCode(404);
      caseId = '';
    });

    apiTest(`should fetch case with 'cases.get'`, async ({ apiServices }) => {
      const fetchedResponse = await apiServices.cases.get(caseId);
      expect(fetchedResponse).toHaveStatusCode(200);
    });

    apiTest(
      `should update case with a new severity with 'cases.update'`,
      async ({ apiServices }) => {
        // First get the case to obtain its current version
        const currentCase = await apiServices.cases.get(caseId);

        const response = await apiServices.cases.update([
          {
            id: caseId,
            version: currentCase.data.version,
            severity: 'medium',
          },
        ]);

        expect(response).toHaveStatusCode(200);
        expect(response.data).toHaveLength(1);
        expect(response.data[0].severity).toBe('medium');
      }
    );

    apiTest('should add a new connector to a case', async ({ apiServices }) => {
      const currentCase = await apiServices.cases.get(caseId);
      const response = await apiServices.cases.update([
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

      expect(response).toHaveStatusCode(200);
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
      expect(createdResponse1).toHaveStatusCode(200);
      expect(createdResponse2).toHaveStatusCode(200);

      await apiServices.cases.cleanup.deleteAllCases();

      const fetchedResponse1 = await apiServices.cases.get(createdResponse1.data.id);
      const fetchedResponse2 = await apiServices.cases.get(createdResponse2.data.id);
      expect(fetchedResponse1).toHaveStatusCode(404);
      expect(fetchedResponse2).toHaveStatusCode(404);
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
      expect(createdResponse1).toHaveStatusCode(200);
      expect(createdResponse2).toHaveStatusCode(200);

      // delete all cases with tag "tag1"
      await apiServices.cases.cleanup.deleteCasesByTags(['tag1']);

      const fetchedResponse1 = await apiServices.cases.get(createdResponse1.data.id);
      const fetchedResponse2 = await apiServices.cases.get(createdResponse2.data.id);

      // this case should have been deleted because it was assigned "tag1"
      expect(fetchedResponse1).toHaveStatusCode(404);

      // this case shouldn't have been deleted because it was assigned "tag2"
      expect(fetchedResponse2).toHaveStatusCode(200);
    });

    apiTest('should post and find a comment', async ({ apiServices }) => {
      const response = await apiServices.cases.comments.create(caseId, {
        type: 'user',
        comment: 'This is a test comment',
        owner: caseOwner,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.data.totalComment).toBe(1);
      expect(response.data.comments).toHaveLength(1);

      // find comment by ID
      const commentId = response.data.comments?.[0]?.id;
      if (!commentId) throw new Error('Comment not found');

      const fetchedResponse = await apiServices.cases.comments.get(caseId, commentId);

      expect(fetchedResponse).toHaveStatusCode(200);
      expect(fetchedResponse.data.comment).toBe('This is a test comment');
    });

    apiTest('should post an alert', async ({ apiServices }) => {
      const createdAlert = await apiServices.cases.comments.create(caseId, {
        type: 'alert',
        owner: caseOwner,
        alertId: 'test-alert-id',
        index: 'test-index',
        rule: { id: 'test-rule-id', name: 'test-rule-name' },
      });

      expect(createdAlert).toHaveStatusCode(200);
      expect(createdAlert.data.totalAlerts).toBe(1);
    });

    apiTest('should search for a case by category', async ({ apiServices }) => {
      const response = await apiServices.cases.find({ category: 'test' });
      expect(response).toHaveStatusCode(200);
      expect(response.data).toHaveLength(1);
    });
  }
);
