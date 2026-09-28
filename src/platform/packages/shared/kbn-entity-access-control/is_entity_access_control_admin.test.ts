/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { isEntityAccessControlAdmin } from './is_entity_access_control_admin';

describe('isEntityAccessControlAdmin', () => {
  const request = httpServerMock.createKibanaRequest();

  it.each([true, false])('uses caller privileges: %s', async (allowed) => {
    const core = coreMock.createStart();
    const client = core.elasticsearch.client.asScoped(request).asCurrentUser;
    jest.spyOn(client.security, 'hasPrivileges').mockResolvedValue({
      username: 'caller',
      has_all_requested: allowed,
      application: {},
      cluster: {},
      index: {},
    });
    expect(await isEntityAccessControlAdmin(core, request)).toBe(allowed);
    expect(core.elasticsearch.client.asScoped).toHaveBeenCalledWith(request);
    expect(client.security.hasPrivileges).toHaveBeenCalledWith({
      application: [
        {
          application: 'kibana-.kibana',
          resources: ['*'],
          privileges: ['entity_access_control:admin'],
        },
      ],
    });
    expect(core.elasticsearch.client.asInternalUser.security.hasPrivileges).not.toHaveBeenCalled();
  });

  it('does not grant an override without a request', async () => {
    const core = coreMock.createStart();
    expect(await isEntityAccessControlAdmin(core)).toBe(false);
    expect(core.elasticsearch.client.asScoped).not.toHaveBeenCalled();
  });

  it('does not grant an override if the privilege check fails', async () => {
    const core = coreMock.createStart();
    jest
      .spyOn(core.elasticsearch.client.asScoped(request).asCurrentUser.security, 'hasPrivileges')
      .mockRejectedValue(new Error('unavailable'));
    expect(await isEntityAccessControlAdmin(core, request)).toBe(false);
  });
});
