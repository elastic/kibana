/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { InvalidAccessControlError } from '@kbn/entity-access-control';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { assertWorkflowOperation, WorkflowAccessControlService } from './workflow_access_control';
import { WorkflowAccessDeniedError } from './workflow_access_denied_error';
import type { ReadModifyWriteWorkflowDocumentParams } from './workflow_occ_types';
import type { WorkflowProperties } from '../storage/workflow_storage';

const makeDocument = (): WorkflowProperties => ({
  name: 'Private workflow',
  enabled: true,
  tags: [],
  triggerTypes: ['manual'],
  yaml: 'name: Private workflow',
  definition: null,
  createdBy: 'alice',
  lastUpdatedBy: 'alice',
  spaceId: 'default',
  deleted_at: null,
  valid: true,
  created_at: '2026-09-10T00:00:00.000Z',
  updated_at: '2026-09-10T00:00:00.000Z',
  owner_id: 'owner',
  access_control: { access_mode: 'private', entries: [] },
});

describe('WorkflowAccessControlService', () => {
  const request = httpServerMock.createKibanaRequest();
  let core: ReturnType<typeof coreMock.createStart>;
  let document: WorkflowProperties;
  let service: WorkflowAccessControlService;
  let authz: ReturnType<typeof securityMock.createStart>['authz'];
  const atSpace = jest.fn();

  beforeEach(() => {
    core = coreMock.createStart();
    core.userProfile.getCurrentProfileId.mockResolvedValue('owner');
    document = makeDocument();
    authz = securityMock.createStart().authz;
    jest.spyOn(authz.actions.api, 'get').mockImplementation((subject: string) => `api:${subject}`);
    atSpace.mockReset().mockResolvedValue({ hasPrivilegeUids: ['reader'] });
    authz.checkUserProfilesPrivileges.mockReturnValue({ atSpace });
    service = new WorkflowAccessControlService(
      core,
      {
        readModifyWriteWorkflowDocument: jest.fn(
          async (
            _id: string,
            _spaceId: string,
            { mutate }: ReadModifyWriteWorkflowDocumentParams
          ) => {
            document = mutate(document);
            return document;
          }
        ),
      },
      authz
    );
  });

  it('lets the owner share without changing the workflow definition', async () => {
    const result = await service.update(
      'id',
      'default',
      { access_mode: 'private', entries: [{ type: 'user', id: 'reader', role: 'viewer' }] },
      request
    );
    expect(result.entries).toEqual([
      { type: 'user', id: 'reader', role: 'viewer', added_at: expect.any(String) },
    ]);
    expect(document.yaml).toBe('name: Private workflow');
    expect(document.owner_id).toBe('owner');
  });

  it('does not allow an editor to change access', async () => {
    document.access_control = {
      access_mode: 'private',
      entries: [
        { type: 'user', id: 'editor', role: 'editor', added_at: '2026-09-10T00:00:00.000Z' },
      ],
    };
    core.userProfile.getCurrentProfileId.mockResolvedValue('editor');
    await expect(
      service.update('id', 'default', { access_mode: 'public', entries: [] }, request)
    ).rejects.toBeInstanceOf(WorkflowAccessDeniedError);
    expect(document.access_control.access_mode).toBe('private');
  });

  it.each([
    ['viewer', ['api:workflowsManagement:read']],
    ['executor', ['api:workflowsManagement:read', 'api:workflowsManagement:execute']],
    [
      'editor',
      [
        'api:workflowsManagement:read',
        'api:workflowsManagement:execute',
        'api:workflowsManagement:update',
      ],
    ],
  ] as const)('checks the RBAC required for %s in the workflow space', async (role, privileges) => {
    await service.update(
      'id',
      'default',
      {
        access_mode: 'private',
        entries: [{ type: 'user', id: 'reader', role }],
      },
      request
    );
    expect(authz.checkUserProfilesPrivileges).toHaveBeenCalledWith(new Set(['reader']));
    expect(atSpace).toHaveBeenCalledWith('default', { kibana: privileges });
  });

  it.each(['viewer', 'executor', 'editor'] as const)(
    'refuses %s grants when the recipient lacks RBAC',
    async (role) => {
      atSpace.mockResolvedValue({ hasPrivilegeUids: [] });
      await expect(
        service.update(
          'id',
          'default',
          {
            access_mode: 'private',
            entries: [{ type: 'user', id: 'reader', role }],
          },
          request
        )
      ).rejects.toBeInstanceOf(InvalidAccessControlError);
      expect(document.access_control?.entries).toEqual([]);
    }
  );

  it('does not save a grant when the privilege check fails', async () => {
    atSpace.mockRejectedValue(new Error('Privilege check failed'));
    await expect(
      service.update(
        'id',
        'default',
        {
          access_mode: 'private',
          entries: [{ type: 'user', id: 'reader', role: 'viewer' }],
        },
        request
      )
    ).rejects.toThrow('Privilege check failed');
    expect(document.access_control?.entries).toEqual([]);
  });

  it('requires every recipient in the same role to have RBAC', async () => {
    await expect(
      service.update(
        'id',
        'default',
        {
          access_mode: 'private',
          entries: [
            { type: 'user', id: 'reader', role: 'viewer' },
            { type: 'user', id: 'without-access', role: 'viewer' },
          ],
        },
        request
      )
    ).rejects.toBeInstanceOf(InvalidAccessControlError);
    expect(document.access_control?.entries).toEqual([]);
  });

  it('refuses grants when the Security privilege service is unavailable', async () => {
    const write = jest.fn();
    service = new WorkflowAccessControlService(core, { readModifyWriteWorkflowDocument: write });
    await expect(
      service.update(
        'id',
        'default',
        {
          access_mode: 'private',
          entries: [{ type: 'user', id: 'reader', role: 'viewer' }],
        },
        request
      )
    ).rejects.toBeInstanceOf(InvalidAccessControlError);
    expect(write).not.toHaveBeenCalled();
  });

  it('allows making a workflow public after a recipient loses RBAC', async () => {
    atSpace.mockResolvedValue({ hasPrivilegeUids: [] });
    await service.update(
      'id',
      'default',
      {
        access_mode: 'public',
        entries: [{ type: 'user', id: 'reader', role: 'viewer' }],
      },
      request
    );
    expect(document.access_control?.access_mode).toBe('public');
    expect(atSpace).not.toHaveBeenCalled();
  });

  it.each(['read', 'edit', 'execute'] as const)(
    'does not require an ACL profile for public %s',
    async (operation) => {
      document.access_control = { access_mode: 'public', entries: [] };
      await expect(service.assertAccess(document, operation, request)).resolves.toBeUndefined();
      expect(core.userProfile.getCurrentProfileId).not.toHaveBeenCalled();
      expect(() => assertWorkflowOperation(document, operation, undefined)).not.toThrow();
    }
  );

  it('refuses access updates without a profile', async () => {
    core.userProfile.getCurrentProfileId.mockResolvedValue(null);
    await expect(
      service.update('id', 'default', { access_mode: 'public', entries: [] }, request)
    ).rejects.toBeInstanceOf(WorkflowAccessDeniedError);
  });

  it('allows only the owner to manage public workflow access', () => {
    document.access_control = { access_mode: 'public', entries: [] };
    expect(() => assertWorkflowOperation(document, 'manage', 'owner')).not.toThrow();
    expect(() => assertWorkflowOperation(document, 'manage', 'other-user')).toThrow(
      WorkflowAccessDeniedError
    );
    expect(() => assertWorkflowOperation(document, 'manage', undefined)).toThrow(
      WorkflowAccessDeniedError
    );
  });

  it('does not allow owners to change managed workflow access', async () => {
    document.managed = true;
    await expect(
      service.update('id', 'default', { access_mode: 'public', entries: [] }, request)
    ).rejects.toBeInstanceOf(WorkflowAccessDeniedError);
  });

  it('uses the current document owner inside the conditional write', async () => {
    document.owner_id = 'different-owner';
    await expect(
      service.update('id', 'default', { access_mode: 'public', entries: [] }, request)
    ).rejects.toBeInstanceOf(WorkflowAccessDeniedError);
  });

  it('does not use a missing profile as system access', () => {
    expect(() => assertWorkflowOperation(document, 'edit', undefined)).toThrow(
      WorkflowAccessDeniedError
    );
  });

  it('closes the search snapshot if execution filtering fails', async () => {
    const client = core.elasticsearch.client.asInternalUser;
    jest
      .mocked(client.openPointInTime)
      .mockResolvedValue({ id: 'pit', _shards: { total: 1, successful: 1, failed: 0 } });
    jest.mocked(client.search).mockRejectedValue(new Error('Search failed'));
    await expect(service.executionFilter('default', request)).rejects.toThrow('Search failed');
    expect(client.closePointInTime).toHaveBeenCalledWith({ id: 'pit' });
  });
});
