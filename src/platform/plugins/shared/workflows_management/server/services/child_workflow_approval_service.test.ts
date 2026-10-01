/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { ChildWorkflowApprovalService } from './child_workflow_approval_service';
import type { WorkflowProperties } from '../storage/workflow_storage';

const workflow = (name: string, childId?: string, accountId?: string): WorkflowProperties => ({
  name,
  yaml: `name: ${name}`,
  version: 1,
  enabled: true,
  valid: true,
  tags: [],
  triggerTypes: ['manual'],
  createdBy: 'admin',
  lastUpdatedBy: 'admin',
  spaceId: 'default',
  created_at: '2026-09-30T00:00:00.000Z',
  updated_at: '2026-09-30T00:00:00.000Z',
  deleted_at: null,
  definition: {
    name,
    version: '1',
    enabled: true,
    triggers: [{ type: 'manual' }],
    settings: accountId ? { run_as: accountId } : undefined,
    steps: childId
      ? [
          {
            name: 'call',
            type: 'workflow.execute',
            with: { 'workflow-id': childId, inheritRunAs: true },
          },
        ]
      : [],
  },
});

describe('child workflow approvals', () => {
  const core = {
    ...coreMock.createStart(),
    security: securityServiceMock.createStart(),
    elasticsearch: elasticsearchServiceMock.createStart(),
  };
  const request = Object.assign(httpServerMock.createKibanaRequest(), {
    authzResult: { [WorkflowsManagementApiActions.update]: true },
  });
  const crud = { indexWorkflowDocument: jest.fn() };
  const access = { assertAccess: jest.fn(), permissions: jest.fn() };
  const service = new ChildWorkflowApprovalService(core, crud, access);
  let documents: Record<string, WorkflowProperties>;
  beforeEach(() => {
    jest.clearAllMocks();
    documents = { parent: workflow('Parent', 'child', 'parent-sa'), child: workflow('Child') };
    core.security.serviceAccounts.isEnabled.mockReturnValue(true);
    core.security.authc.getCurrentUser.mockReturnValue(
      securityServiceMock.createMockAuthenticatedUser({ username: 'admin' })
    );
    core.elasticsearch.client.asScoped().asCurrentUser.security.hasPrivileges.mockResolvedValue({
      has_all_requested: true,
      username: 'admin',
      cluster: { manage_security: true },
      index: {},
      application: {},
    });
    core.elasticsearch.client.asInternalUser.get.mockImplementation(async ({ id }) => ({
      _source: documents[id],
      _seq_no: 10,
      _primary_term: 1,
      _index: 'workflows',
      _id: id,
      found: true,
      _version: 1,
    }));
    access.permissions.mockResolvedValue({ read: true, execute: true, edit: true });
    access.assertAccess.mockResolvedValue(undefined);
  });

  it('does not approve on review; approval persists the exact reviewed code outside YAML', async () => {
    const review = await service.review('parent', 'default', request);
    expect(review.children[0].status).toBe('unapproved');
    expect(crud.indexWorkflowDocument).not.toHaveBeenCalled();
    await service.approve('parent', 'default', request, review.reviewToken);
    expect(crud.indexWorkflowDocument).toHaveBeenCalledWith(
      'parent',
      expect.objectContaining({ yaml: 'name: Parent' }),
      expect.objectContaining({
        ifSeqNo: 10,
        ifPrimaryTerm: 1,
        childApproval: expect.objectContaining({
          serviceAccountId: 'parent-sa',
          approvedBy: 'admin',
          snapshots: [expect.objectContaining({ yaml: 'name: Child', path: ['call'] })],
        }),
      })
    );
  });

  it.each(['parent', 'child'])('rejects stale review after %s changes', async (id) => {
    const review = await service.review('parent', 'default', request);
    documents[id].yaml += '\nchanged';
    if (id === 'parent')
      core.elasticsearch.client.asInternalUser.get.mockImplementation(async ({ id: target }) => ({
        _source: documents[target],
        _seq_no: 11,
        _primary_term: 1,
        _index: 'workflows',
        _id: target,
        found: true,
        _version: 1,
      }));
    await expect(service.approve('parent', 'default', request, review.reviewToken)).rejects.toThrow(
      'changed during review'
    );
    expect(crud.indexWorkflowDocument).not.toHaveBeenCalled();
  });

  it('requires manage_security even when the caller can edit workflows', async () => {
    const review = await service.review('parent', 'default', request);
    core.elasticsearch.client.asScoped().asCurrentUser.security.hasPrivileges.mockResolvedValue({
      has_all_requested: false,
      username: 'editor',
      cluster: { manage_security: false },
      index: {},
      application: {},
    });
    await expect(service.approve('parent', 'default', request, review.reviewToken)).rejects.toThrow(
      'manage_security'
    );
    expect(crud.indexWorkflowDocument).not.toHaveBeenCalled();
  });

  it('collects and reviews nested inherited children, without trusting child approval metadata', async () => {
    documents.child = workflow('Child', 'grandchild');
    documents.grandchild = workflow('Grandchild');
    const review = await service.review('parent', 'default', request);
    expect(review.children.map(({ path }) => path)).toEqual([['call'], ['call', 'call']]);
    documents.grandchild.yaml += 'edited';
    await expect(service.approve('parent', 'default', request, review.reviewToken)).rejects.toThrow(
      'changed during review'
    );
  });

  it('shows edited versions as pending without replacing the approved code', async () => {
    const review = await service.review('parent', 'default', request);
    await service.approve('parent', 'default', request, review.reviewToken);
    documents.parent.childWorkflowApprovals =
      crud.indexWorkflowDocument.mock.calls[0][2].childApproval;
    documents.child.yaml = 'new unapproved code';
    documents.child.version = 2;
    expect((await service.review('parent', 'default', request)).children[0]).toMatchObject({
      status: 'changed',
      approvedVersion: 1,
      currentVersion: 2,
      approvedYaml: 'name: Child',
    });
  });

  it('rejects child recreation and SA changes during review', async () => {
    const review = await service.review('parent', 'default', request);
    documents.child.created_at = '2026-10-01T00:00:00.000Z';
    await expect(service.approve('parent', 'default', request, review.reviewToken)).rejects.toThrow(
      'changed during review'
    );
  });

  it('rejects cycles, cross-space children, and disabled service accounts', async () => {
    documents.child = workflow('Child', 'parent');
    await expect(service.review('parent', 'default', request)).rejects.toThrow('cycle');
    documents.child = { ...workflow('Child'), spaceId: 'other' };
    await expect(service.review('parent', 'default', request)).rejects.toThrow('same space');
    core.security.serviceAccounts.isEnabled.mockReturnValue(false);
    await expect(service.review('parent', 'default', request)).rejects.toThrow('disabled');
  });

  it('requires override for bound children and never changes their own binding', async () => {
    documents.child = workflow('Child', undefined, 'child-sa');
    await expect(service.review('parent', 'default', request)).rejects.toThrow('override');
    if (!documents.parent.definition) throw new Error('Missing fixture definition');
    documents.parent.definition.steps = [
      {
        name: 'call',
        type: 'workflow.executeAsync',
        with: { 'workflow-id': 'child', runAsMode: 'override' },
      },
    ];
    const review = await service.review('parent', 'default', request);
    await service.approve('parent', 'default', request, review.reviewToken);
    expect(documents.child.definition?.settings?.run_as).toBe('child-sa');
    expect(crud.indexWorkflowDocument).toHaveBeenCalledTimes(1);
  });
});
