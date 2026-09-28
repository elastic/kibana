/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { logEntityAccessControl } from './audit';

describe('entity access control audit', () => {
  it.each(['denied', 'admin_override'] as const)('records %s with caller context', (action) => {
    const core = coreMock.createStart();
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
        category: ['iam'],
        type: ['access'],
        outcome: action === 'denied' ? 'failure' : 'success',
      },
      kibana: { space_id: 'space' },
    });
  });

  it('records access changes without entity contents', () => {
    const core = coreMock.createStart();
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
          category: ['iam'],
          type: ['change'],
          outcome: 'success',
        },
      })
    );
    const message = jest.mocked(core.security.audit.withoutRequest.log).mock.calls[0][0]?.message;
    expect(message).toContain('"previous":{"owner_id":"owner"}');
    expect(message).not.toContain('secret');
    expect(message).not.toContain('yaml');
  });
});
