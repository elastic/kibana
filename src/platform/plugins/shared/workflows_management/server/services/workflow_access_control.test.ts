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
import { WorkflowConflictError } from '@kbn/workflows-yaml';
import { assertWorkflowOperation, WorkflowAccessControlService } from './workflow_access_control';
import { WorkflowAccessDeniedError } from './workflow_access_denied_error';
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
  let crud: ConstructorParameters<typeof WorkflowAccessControlService>[1];
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
    crud = {
      getWorkflowDocumentWithVersion: jest.fn(async () => ({
        source: document,
        seqNo: 1,
        primaryTerm: 1,
      })),
      writeWorkflowDocumentWithOcc: jest.fn(async (_id, _spaceId, { document: updated }) => {
        document = updated;
        return document;
      }),
    };
    service = new WorkflowAccessControlService(core, crud, authz);
  });

  it.each(['public', 'private'] as const)(
    'redacts %s ACL recipients from non-managers',
    async (mode) => {
      for (const role of ['viewer', 'executor', 'editor'] as const) {
        document.access_control = {
          access_mode: mode,
          entries: [{ type: 'user', id: 'reader', role, added_at: '2026-09-10' }],
        };
        core.userProfile.getCurrentProfileId.mockResolvedValue('reader');
        const result = await service.toDto(document, request);
        expect(result).not.toHaveProperty('owner_id');
        expect(result).not.toHaveProperty('access_control');
        expect(result.permissions).toMatchObject({ read: true, manage: false });
        expect(result.permissions.execute).toBe(mode === 'public' || role !== 'viewer');
        expect(document.access_control.entries).toHaveLength(1);
      }
    }
  );

  it('retains the full ACL for its owner', async () => {
    const result = await service.toDto(document, request);
    expect(result.owner_id).toBe('owner');
    expect(result.access_control).toEqual(document.access_control);
    expect(result.permissions.manage).toBe(true);
  });

  it.each(['alice', 'bob'])(
    'only lets the creator claim a legacy workflow: %s',
    async (username) => {
      delete document.owner_id;
      delete document.access_control;
      jest
        .spyOn(core.security.authc, 'getCurrentUser')
        .mockReturnValue(securityMock.createMockAuthenticatedUser({ username }));
      const update = service.update('id', 'default', { access_mode: 'private' }, request);

      if (username === 'alice') {
        await expect(update).resolves.toMatchObject({
          owner_id: 'owner',
          access_control: { access_mode: 'private', entries: [] },
        });
      } else {
        await expect(update).rejects.toBeInstanceOf(WorkflowAccessDeniedError);
        expect(crud.writeWorkflowDocumentWithOcc).not.toHaveBeenCalled();
      }
    }
  );

  it('lets the owner share without changing the workflow definition', async () => {
    const result = await service.update(
      'id',
      'default',
      { access_mode: 'private', entries: [{ type: 'user', id: 'reader', role: 'viewer' }] },
      request
    );
    expect(result.access_control?.entries).toEqual([
      { type: 'user', id: 'reader', role: 'viewer', added_at: expect.any(String) },
    ]);
    expect(result.lastUpdatedAt).toBe(document.updated_at);
    expect(result.lastUpdatedBy).toBe(document.lastUpdatedBy);
    expect(result.owner_id).toBe('owner');
    expect(document.yaml).toBe('name: Private workflow');
    expect(document.owner_id).toBe('owner');
  });

  it('returns only access metadata from the stored workflow', async () => {
    document.version = 7;
    const result = await service.update('id', 'default', { access_mode: 'public' }, request);
    expect(result).toEqual({
      owner_id: 'owner',
      access_control: document.access_control,
      lastUpdatedAt: document.updated_at,
      lastUpdatedBy: document.lastUpdatedBy,
      version: 7,
    });
    expect(result).not.toHaveProperty('yaml');
    expect(result).not.toHaveProperty('definition');
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

  it.each(['viewer', 'executor', 'editor'] as const)(
    'removes another recipient while an unchanged %s lacks RBAC',
    async (role) => {
      document.access_control = {
        access_mode: 'private',
        entries: [
          { type: 'user', id: 'reader', role, added_at: '2026-09-10' },
          { type: 'user', id: 'removed', role: 'viewer', added_at: '2026-09-10' },
        ],
      };
      atSpace.mockResolvedValue({ hasPrivilegeUids: [] });
      const result = await service.update(
        'id',
        'default',
        {
          access_mode: 'private',
          entries: [{ type: 'user', id: 'reader', role }],
        },
        request
      );
      expect(result.access_control?.entries.map(({ id }) => id)).toEqual(['reader']);
      expect(authz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['editor', 'executor'],
    ['editor', 'viewer'],
    ['executor', 'viewer'],
  ] as const)('allows a decrease from %s to %s without RBAC', async (previous, role) => {
    document.access_control = {
      access_mode: 'private',
      entries: [{ type: 'user', id: 'reader', role: previous, added_at: '2026-09-10' }],
    };
    atSpace.mockResolvedValue({ hasPrivilegeUids: [] });
    const result = await service.update(
      'id',
      'default',
      {
        access_mode: 'private',
        entries: [{ type: 'user', id: 'reader', role }],
      },
      request
    );
    expect(result.access_control?.entries[0].role).toBe(role);
    expect(authz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
  });

  it.each(['executor', 'editor'] as const)(
    'rejects an increase to %s without RBAC',
    async (role) => {
      document.access_control = {
        access_mode: 'private',
        entries: [{ type: 'user', id: 'reader', role: 'viewer', added_at: '2026-09-10' }],
      };
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
      expect(document.access_control.entries[0].role).toBe('viewer');
    }
  );

  it('rejects a concurrent removal conflict without restoring the removed grant', async () => {
    document.access_control = {
      access_mode: 'private',
      entries: [{ type: 'user', id: 'reader', role: 'viewer', added_at: '2026-09-10' }],
    };
    jest.mocked(crud.writeWorkflowDocumentWithOcc).mockImplementation(async () => {
      document = makeDocument();
      throw new WorkflowConflictError('Workflow was updated concurrently.', 'id');
    });
    atSpace.mockResolvedValue({ hasPrivilegeUids: [] });
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
    ).rejects.toBeInstanceOf(WorkflowConflictError);
    expect(crud.getWorkflowDocumentWithVersion).toHaveBeenCalledTimes(1);
    expect(crud.writeWorkflowDocumentWithOcc).toHaveBeenCalledTimes(1);
    expect(crud.writeWorkflowDocumentWithOcc).toHaveBeenCalledWith(
      'id',
      'default',
      expect.objectContaining({ ifSeqNo: 1, ifPrimaryTerm: 1 })
    );
    expect(atSpace).not.toHaveBeenCalled();
    expect(document.access_control?.entries).toEqual([]);
  });

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
    service = new WorkflowAccessControlService(core, crud);
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
    expect(document.access_control?.entries).toEqual([]);
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
      core.userProfile.getCurrentProfileId.mockResolvedValue(null);
      await expect(service.assertAccess(document, operation, request)).resolves.toBeUndefined();
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

  it('shares one execution filter and profile lookup within a request and space', async () => {
    const client = core.elasticsearch.client.asInternalUser;
    jest.mocked(client.openPointInTime).mockResolvedValue({
      id: 'pit',
      _shards: { total: 1, successful: 1, failed: 0 },
    });
    jest.mocked(client.search).mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: { hits: [{ _index: 'workflows', _id: 'hidden-workflow' }] },
    });

    const [first, second] = await Promise.all([
      service.executionFilter('default', request),
      service.executionFilter('default', request),
    ]);
    await service.permissions(document, request);

    expect(first).toEqual({ bool: { must_not: [{ terms: { workflowId: ['hidden-workflow'] } }] } });
    expect(second).toBe(first);
    expect(client.openPointInTime).toHaveBeenCalledTimes(1);
    expect(client.search).toHaveBeenCalledTimes(1);
    expect(core.userProfile.getCurrentProfileId).toHaveBeenCalledTimes(1);

    await service.executionFilter('another-space', request);
    await service.executionFilter('default', httpServerMock.createKibanaRequest());
    expect(client.search).toHaveBeenCalledTimes(3);
    expect(core.userProfile.getCurrentProfileId).toHaveBeenCalledTimes(2);
  });

  it.each([
    { timedOut: true, failedShards: 0 },
    { timedOut: false, failedShards: 1 },
  ])(
    'rejects incomplete execution access results: timeout=$timedOut, failed shards=$failedShards',
    async ({ timedOut, failedShards }) => {
      const client = core.elasticsearch.client.asInternalUser;
      jest.mocked(client.openPointInTime).mockResolvedValue({
        id: 'pit',
        _shards: { total: 1, successful: 1, failed: 0 },
      });
      jest.mocked(client.search).mockResolvedValue({
        pit_id: 'new-pit',
        took: 1,
        timed_out: timedOut,
        _shards: { total: 1, successful: 1 - failedShards, failed: failedShards },
        hits: { hits: [] },
      });

      await expect(service.executionFilter('default', request)).rejects.toThrow(
        'Could not determine workflow execution access from incomplete results.'
      );
      expect(client.openPointInTime).toHaveBeenCalledWith(
        expect.objectContaining({ allow_partial_search_results: false })
      );
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({ allow_partial_search_results: false })
      );
      expect(client.closePointInTime).toHaveBeenCalledWith({ id: 'new-pit' });
    }
  );
});
