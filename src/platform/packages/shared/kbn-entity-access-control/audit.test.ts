/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { logEntityAccessControl } from './audit';

describe('entity access control audit', () => {
  it.each(['denied', 'admin_override'] as const)('records %s with caller context', (action) => {
    const core = { security: securityServiceMock.createStart() };
    const request = httpServerMock.createKibanaRequest();
    logEntityAccessControl(core, request, {
      entityType: 'connector',
      entityId: 'id',
      spaceId: 'space',
      operation: 'execute',
      action,
    });
    expect(core.security.audit.asScoped).toHaveBeenCalledWith(request);
    expect(core.security.audit.asScoped(request).log).toHaveBeenCalledWith({
      message: expect.stringContaining('"entityId":"id","operation":"execute"'),
      event: {
        action: `connector_access_control_${action}`,
        category: ['database'],
        type: ['access'],
        outcome: action === 'denied' ? 'failure' : 'success',
      },
      kibana: { space_id: 'space' },
    });
  });

  it('records access changes without entity contents', () => {
    const core = { security: securityServiceMock.createStart() };
    const previous = { owner_id: 'owner', yaml: 'secret' };
    const current = {
      ...previous,
      access_control: {
        access_mode: 'private' as const,
        entries: [
          {
            type: 'user' as const,
            id: 'recipient',
            role: 'executor',
            added_at: '2026-09-28',
          },
        ],
      },
    };
    logEntityAccessControl(core, undefined, {
      entityType: 'workflow',
      entityId: 'id',
      action: 'update',
      previous,
      current,
    });
    expect(core.security.audit.withoutRequest.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('"role":"executor"'),
        event: {
          action: 'workflow_access_control_update',
          category: ['database'],
          type: ['change'],
          outcome: 'success',
        },
      })
    );
    const message = jest.mocked(core.security.audit.withoutRequest.log).mock.calls[0][0]?.message;
    expect(message).toContain('"entry_count":1');
    expect(message).not.toContain('owner_id');
    expect(message).not.toContain('secret');
    expect(message).not.toContain('yaml');
  });
  it('records additions, removals, role changes and visibility without unchanged users', () => {
    const core = { security: securityServiceMock.createStart() };
    const entry = (id: string, role = 'viewer') => ({
      type: 'user' as const,
      id,
      role,
      added_at: '2026-09-30',
    });
    logEntityAccessControl(core, undefined, {
      entityType: 'workflow',
      entityId: 'id',
      action: 'update',
      previous: {
        owner_id: 'old-owner',
        access_control: {
          access_mode: 'public',
          entries: [entry('removed'), entry('changed'), entry('unchanged')],
        },
      },
      current: {
        owner_id: 'new-owner',
        access_control: {
          access_mode: 'private',
          entries: [entry('added'), entry('changed', 'editor'), entry('unchanged')],
        },
      },
    });
    const messages = core.security.audit.withoutRequest.log.mock.calls.map(
      ([event]) => event?.message
    );
    expect(messages).toHaveLength(4);
    expect(messages[0]).toContain('"previous_access_mode":"public"');
    expect(messages[0]).toContain('"previous_owner_id":"old-owner","owner_id":"new-owner"');
    expect(messages[1]).toContain('"user_id":"removed","previous_role":"viewer","role":null');
    expect(messages[2]).toContain('"user_id":"changed","previous_role":"viewer","role":"editor"');
    expect(messages[3]).toContain('"user_id":"added","previous_role":null,"role":"viewer"');
    expect(messages.join()).not.toContain('unchanged');
  });

  it('keeps each event small when all 100 long principal IDs change', () => {
    const core = { security: securityServiceMock.createStart() };
    const entries = Array.from({ length: 100 }, (_, index) => ({
      type: 'user' as const,
      id: String(index).padEnd(1024, 'x'),
      role: 'viewer',
      added_at: '2026-09-30',
    }));
    logEntityAccessControl(core, undefined, {
      entityType: 'workflow',
      entityId: 'id',
      action: 'update',
      previous: { access_control: { access_mode: 'private', entries } },
      current: {
        access_control: {
          access_mode: 'private',
          entries: entries.map((entry) => ({ ...entry, role: 'editor' })),
        },
      },
    });
    const calls = core.security.audit.withoutRequest.log.mock.calls;
    expect(calls).toHaveLength(101);
    for (const [event] of calls) expect(Buffer.byteLength(event?.message ?? '')).toBeLessThan(2048);
  });
});
