/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getWorkflowPermissions } from './access_control';
import type { WorkflowAccessControlRole } from './access_control';

describe('workflow ACL permissions', () => {
  it.each<WorkflowAccessControlRole>(['viewer', 'executor', 'editor'])(
    'resolves the %s role',
    (role) => {
      expect(
        getWorkflowPermissions(
          {
            owner_id: 'owner',
            access_control: {
              access_mode: 'private',
              entries: [{ type: 'user', id: 'reader', role, added_at: '2026-09-10T00:00:00.000Z' }],
            },
          },
          'reader'
        )
      ).toEqual({ read: true, execute: role !== 'viewer', edit: role === 'editor', manage: false });
    }
  );
  it('keeps legacy access when there is no ACL', () => {
    expect(getWorkflowPermissions({}, undefined)).toEqual({
      read: true,
      execute: true,
      edit: true,
      manage: false,
    });
  });
  it('grants all operations to the owner', () => {
    expect(
      getWorkflowPermissions(
        { owner_id: 'owner', access_control: { access_mode: 'private', entries: [] } },
        'owner'
      )
    ).toEqual({ read: true, execute: true, edit: true, manage: true });
  });
  it.each(['reader', undefined])('leaves public operations to RBAC for profile %s', (profileId) => {
    expect(
      getWorkflowPermissions(
        { owner_id: 'owner', access_control: { access_mode: 'public', entries: [] } },
        profileId
      )
    ).toEqual({ read: true, execute: true, edit: true, manage: false });
  });
  it('ignores stored user roles while public and applies them again when private', () => {
    const workflow = {
      owner_id: 'owner',
      access_control: {
        access_mode: 'public' as const,
        entries: [
          {
            type: 'user' as const,
            id: 'reader',
            role: 'viewer' as const,
            added_at: '2026-09-10T00:00:00.000Z',
          },
        ],
      },
    };
    expect(getWorkflowPermissions(workflow, 'reader')).toEqual({
      read: true,
      execute: true,
      edit: true,
      manage: false,
    });
    expect(
      getWorkflowPermissions(
        { ...workflow, access_control: { ...workflow.access_control, access_mode: 'private' } },
        'reader'
      )
    ).toEqual({ read: true, execute: false, edit: false, manage: false });
  });
  it('denies private access without a profile', () => {
    expect(
      getWorkflowPermissions(
        { owner_id: 'owner', access_control: { access_mode: 'private', entries: [] } },
        undefined
      )
    ).toEqual({ read: false, execute: false, edit: false, manage: false });
  });
});
