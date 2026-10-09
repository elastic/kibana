/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServerMock, securityServiceMock } from '@kbn/core/server/mocks';
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
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let core: ReturnType<typeof coreMock.createStart>;
  let document: WorkflowProperties;
  let service: WorkflowAccessControlService;
  let crud: ConstructorParameters<typeof WorkflowAccessControlService>[1];
  let authz: ReturnType<typeof securityMock.createStart>['authz'];
  const atSpace = jest.fn();
  const globally = jest.fn();

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    core = coreMock.createStart();
    core.userProfile.getCurrentProfileId.mockResolvedValue('owner');
    document = makeDocument();
    authz = securityMock.createStart().authz;
    globally.mockReset().mockImplementation(async () => ({
      hasAllRequested:
        core.security.authc.getCurrentUser(request)?.roles.includes('superuser') ?? false,
      username: 'user',
      privileges: { kibana: [], elasticsearch: { cluster: {}, index: {} } },
    }));
    authz.checkPrivilegesWithRequest.mockReturnValue({
      globally,
      atSpace: jest.fn(),
      atSpaces: jest.fn(),
    });
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

  describe('audit logging', () => {
    it.each(['read', 'edit', 'execute', 'manage'] as const)(
      'records denied %s access',
      async (operation) => {
        core.userProfile.getCurrentProfileId.mockResolvedValue('outsider');
        await expect(
          service.assertAccess({ ...document, id: 'id' }, operation, request)
        ).rejects.toBeInstanceOf(WorkflowAccessDeniedError);
        expect(core.security.audit.asScoped(request).log).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining(`"operation":"${operation}"`),
            event: expect.objectContaining({
              action: 'workflow_access_control_denied',
              outcome: 'failure',
            }),
            kibana: { space_id: 'default' },
          })
        );
      }
    );

    it('does not audit DTO mapping for hidden documents', async () => {
      core.userProfile.getCurrentProfileId.mockResolvedValue('outsider');
      const result = await service.toDto(document, request);
      expect(result.permissions.read).toBe(false);
      expect(core.security.audit.asScoped(request).log).not.toHaveBeenCalled();
    });

    it('does not audit search filters or mapped rows for an administrator', async () => {
      core.userProfile.getCurrentProfileId.mockResolvedValue('admin');
      jest
        .spyOn(core.security.authc, 'getCurrentUser')
        .mockReturnValue(securityServiceMock.createMockAuthenticatedUser({ roles: ['superuser'] }));
      expect(await service.readFilter(request)).toEqual({ match_all: {} });
      expect(await service.executionFilter('default', request)).toEqual({ match_all: {} });
      for (let index = 0; index < 100; index++) {
        const result = await service.toDto({ ...document, id: String(index) }, request);
        expect(result.permissions.read).toBe(true);
      }
      expect(globally).toHaveBeenCalledTimes(1);
      expect(core.security.audit.asScoped(request).log).not.toHaveBeenCalled();
    });

    it('does not report an override for an administrator who created an ownerless workflow', async () => {
      jest.spyOn(core.security.authc, 'getCurrentUser').mockReturnValue(
        securityServiceMock.createMockAuthenticatedUser({
          username: 'alice',
          roles: ['superuser'],
        })
      );
      await service.assertAccess(
        { ...document, id: 'legacy', owner_id: undefined, access_control: undefined },
        'manage',
        request
      );
      expect(core.security.audit.asScoped(request).log).not.toHaveBeenCalled();
    });

    it('does not label the managed-workflow restriction as an ACL denial', async () => {
      document.managed = true;
      await expect(
        service.update('id', 'default', { access_mode: 'private' }, request)
      ).rejects.toThrow(WorkflowAccessDeniedError);
      expect(core.security.audit.asScoped(request).log).not.toHaveBeenCalled();
    });

    it('can suppress override events for user suggestions', async () => {
      core.userProfile.getCurrentProfileId.mockResolvedValue('admin');
      jest
        .spyOn(core.security.authc, 'getCurrentUser')
        .mockReturnValue(securityServiceMock.createMockAuthenticatedUser({ roles: ['superuser'] }));
      await service.assertAccess({ ...document, id: 'id' }, 'manage', request, {
        auditOverride: false,
      });
      expect(core.security.audit.asScoped(request).log).not.toHaveBeenCalled();
      await service.assertAccess({ ...document, id: 'id' }, 'manage', request);
      expect(core.security.audit.asScoped(request).log).toHaveBeenCalledTimes(1);
    });

    it('still records a denial when override auditing is suppressed', async () => {
      core.userProfile.getCurrentProfileId.mockResolvedValue('outsider');
      await expect(
        service.assertAccess({ ...document, id: 'id' }, 'manage', request, { auditOverride: false })
      ).rejects.toThrow(WorkflowAccessDeniedError);
      expect(core.security.audit.asScoped(request).log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ action: 'workflow_access_control_denied' }),
        })
      );
    });

    it('records the stored grant change and preserves the owner', async () => {
      await service.update(
        'id',
        'default',
        {
          access_mode: 'private',
          entries: [{ type: 'user', id: 'reader', role: 'viewer' }],
        },
        request
      );
      const audit = core.security.audit.asScoped(request).log;
      expect(audit).toHaveBeenCalledTimes(2);
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'workflow_access_control_update',
            outcome: 'success',
          }),
        })
      );
      expect(jest.mocked(audit).mock.calls[0][0]?.message).toContain('"entry_count":1');
      expect(jest.mocked(audit).mock.calls[1][0]?.message).toContain(
        '"user_id":"reader","previous_role":null,"role":"viewer"'
      );
    });

    it('does not report an access change when storage rejects the write', async () => {
      jest
        .mocked(crud.writeWorkflowDocumentWithOcc)
        .mockRejectedValue(new WorkflowConflictError('conflict', 'id'));
      await expect(
        service.update('id', 'default', { access_mode: 'public' }, request)
      ).rejects.toThrow('conflict');
      expect(core.security.audit.asScoped(request).log).not.toHaveBeenCalled();
    });

    it.each([false, true])(
      'records an override only when the admin needs it (owner=%s)',
      async (isOwner) => {
        core.userProfile.getCurrentProfileId.mockResolvedValue(isOwner ? 'owner' : 'admin');
        jest
          .spyOn(core.security.authc, 'getCurrentUser')
          .mockReturnValue(
            securityServiceMock.createMockAuthenticatedUser({ roles: ['superuser'] })
          );
        await service.assertAccess({ ...document, id: 'id' }, 'manage', request);
        const audit = core.security.audit.asScoped(request).log;
        expect(audit).toHaveBeenCalledTimes(isOwner ? 0 : 1);
        if (!isOwner)
          expect(audit).toHaveBeenCalledWith(
            expect.objectContaining({
              event: expect.objectContaining({
                action: 'workflow_access_control_admin_override',
                outcome: 'success',
              }),
            })
          );
      }
    );
  });

  describe('administrator override', () => {
    beforeEach(() => {
      core.userProfile.getCurrentProfileId.mockResolvedValue('admin');
      jest
        .spyOn(core.security.authc, 'getCurrentUser')
        .mockReturnValue(securityServiceMock.createMockAuthenticatedUser({ roles: ['superuser'] }));
    });

    it('exposes private workflows, their ACL, and history to an administrator', async () => {
      const result = await service.toDto(document, request);
      expect(result.owner_id).toBe('owner');
      expect(result.access_control).toEqual(document.access_control);
      expect(result.permissions).toEqual({ read: true, execute: false, edit: false, manage: true });
      expect(await service.readFilter(request)).toEqual({ match_all: {} });
      expect(await service.executionFilter('default', request)).toEqual({ match_all: {} });
      expect(core.elasticsearch.client.asInternalUser.openPointInTime).not.toHaveBeenCalled();
    });

    it('does not use the override for execution or draft tests', async () => {
      await expect(
        service.assertAccess({ ...document, id: 'id' }, 'edit', request)
      ).rejects.toBeInstanceOf(WorkflowAccessDeniedError);
      await expect(
        service.assertAccess({ ...document, id: 'id' }, 'execute', request)
      ).rejects.toBeInstanceOf(WorkflowAccessDeniedError);
      await expect(
        service.assertAccess({ ...document, id: 'id' }, 'edit', request, {
          allowAdminOverride: false,
        })
      ).rejects.toBeInstanceOf(WorkflowAccessDeniedError);
    });

    it('changes access without replacing the owner or dropping the admin grant', async () => {
      atSpace.mockResolvedValue({ hasPrivilegeUids: ['admin', 'reader'] });
      const result = await service.update(
        'id',
        'default',
        {
          access_mode: 'private',
          entries: [
            { type: 'user', id: 'owner', role: 'viewer' },
            { type: 'user', id: 'admin', role: 'editor' },
            { type: 'user', id: 'reader', role: 'viewer' },
          ],
        },
        request
      );
      expect(result.owner_id).toBe('owner');
      expect(result.access_control?.entries.map(({ id }) => id)).toEqual(['admin', 'reader']);
      expect(authz.checkUserProfilesPrivileges).toHaveBeenCalledWith(new Set(['admin']));
      expect(authz.checkUserProfilesPrivileges).not.toHaveBeenCalledWith(new Set(['owner']));
    });

    it('can recover an owned workflow without a current profile', async () => {
      core.userProfile.getCurrentProfileId.mockResolvedValue(null);
      await expect(
        service.update('id', 'default', { access_mode: 'public' }, request)
      ).resolves.toMatchObject({
        owner_id: 'owner',
        access_control: { access_mode: 'public' },
      });
    });

    it('claims an ownerless legacy workflow', async () => {
      delete document.owner_id;
      delete document.access_control;
      await expect(
        service.update('id', 'default', { access_mode: 'private' }, request)
      ).resolves.toMatchObject({
        owner_id: 'admin',
        access_control: { access_mode: 'private' },
      });
    });

    it.each([undefined, { access_mode: 'public' as const, entries: [] }])(
      'leaves a public workflow ownerless and preserves creator access',
      async (accessControl) => {
        delete document.owner_id;
        document.access_control = accessControl;
        const result = await service.update('id', 'default', { access_mode: 'public' }, request);
        expect(result.owner_id).toBeUndefined();
        expect(document.owner_id).toBeUndefined();
        jest
          .spyOn(core.security.authc, 'getCurrentUser')
          .mockReturnValue(
            securityServiceMock.createMockAuthenticatedUser({ username: 'alice', roles: [] })
          );
        core.userProfile.getCurrentProfileId.mockResolvedValue('alice-profile');
        const creatorRequest = httpServerMock.createKibanaRequest();
        expect((await service.permissions(document, creatorRequest)).manage).toBe(true);
        const claimed = await service.update(
          'id',
          'default',
          { access_mode: 'private' },
          creatorRequest
        );
        expect(claimed.owner_id).toBe('alice-profile');
      }
    );

    it('still rejects new grants without recipient RBAC', async () => {
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
      ).rejects.toBeInstanceOf(InvalidAccessControlError);
      expect(crud.writeWorkflowDocumentWithOcc).not.toHaveBeenCalled();
    });

    it('does not change managed workflow sharing', async () => {
      document.managed = true;
      await expect(
        service.update('id', 'default', { access_mode: 'public' }, request)
      ).rejects.toBeInstanceOf(WorkflowAccessDeniedError);
      expect(crud.writeWorkflowDocumentWithOcc).not.toHaveBeenCalled();
      expect(core.security.audit.asScoped(request).log).not.toHaveBeenCalled();
    });

    it('does not apply the override to a read without caller context', async () => {
      expect(await service.permissions(document)).toEqual({
        read: false,
        execute: false,
        edit: false,
        manage: false,
      });
    });
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

  it('returns access metadata and current permissions from the stored workflow', async () => {
    document.version = 7;
    const result = await service.update('id', 'default', { access_mode: 'public' }, request);
    expect(result).toEqual({
      owner_id: 'owner',
      access_control: document.access_control,
      permissions: { read: true, execute: true, edit: true, manage: true },
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
    const previousDocument = document;
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
      expect.objectContaining({ ifSeqNo: 1, ifPrimaryTerm: 1, request, previousDocument })
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
      await expect(
        service.assertAccess({ ...document, id: 'id' }, operation, request)
      ).resolves.toBeUndefined();
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
      hits: {
        hits: [
          {
            _index: 'workflows',
            _id: 'hidden-workflow',
            _source: { ...document, owner_id: 'other' },
          },
        ],
      },
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
    { workflowSpaceId: 'default', deletedAt: null },
    { workflowSpaceId: '*', deletedAt: null },
    { workflowSpaceId: '*', deletedAt: '2026-09-27T00:00:00.000Z' },
  ])(
    'filters execution access for space=$workflowSpaceId, deleted=$deletedAt',
    async ({ workflowSpaceId, deletedAt }) => {
      const client = core.elasticsearch.client.asInternalUser;
      jest.mocked(client.openPointInTime).mockResolvedValue({
        id: 'pit',
        _shards: { total: 1, successful: 1, failed: 0 },
      });
      const grant = { type: 'user', id: 'owner', role: 'viewer', added_at: '2026-09-22' };
      jest.mocked(client.search).mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          hits: [
            { _index: 'workflows', _id: 'legacy', _source: {} },
            {
              _index: 'workflows',
              _id: 'public',
              _source: { access_control: { access_mode: 'public', entries: [] } },
            },
            { _index: 'workflows', _id: 'owned', _source: document },
            {
              _index: 'workflows',
              _id: 'shared',
              _source: { access_control: { access_mode: 'private', entries: [grant] } },
            },
            {
              _index: 'workflows',
              _id: 'hidden',
              _source: { ...document, owner_id: 'another-owner' },
            },
          ].map((hit) => ({
            ...hit,
            _source: { ...hit._source, spaceId: workflowSpaceId, deleted_at: deletedAt },
          })),
        },
      });

      await expect(service.executionFilter('default', request)).resolves.toEqual({
        bool: { must_not: [{ terms: { workflowId: ['hidden'] } }] },
      });
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: ['owner_id', 'access_control'],
          query: { terms: { spaceId: ['default', '*'] } },
        })
      );
    }
  );

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
