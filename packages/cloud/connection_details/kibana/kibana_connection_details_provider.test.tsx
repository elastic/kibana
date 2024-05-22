/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { createOpts } from './kibana_connection_details_provider';

describe('createOpts()', () => {
  it('allows editing API keys, when user can manage own API keys', async () => {
    const props = await createOpts({
      start: {
        core: coreMock.createStart(),
        plugins: {
          security: {
            authz: {
              getCurrentUserApiKeyPrivileges: jest
                .fn()
                .mockResolvedValue({ canManageOwnApiKeys: true }),
            },
          } as any,
        },
      },
    });
    const hasPermission = await props.apiKeys!.hasPermission();

    expect(hasPermission).toBe(true);
  });

  it('does not allow editing API keys, when user can manage own API keys', async () => {
    const props = await createOpts({
      start: {
        core: coreMock.createStart(),
        plugins: {
          security: {
            authz: {
              getCurrentUserApiKeyPrivileges: jest
                .fn()
                .mockResolvedValue({ canManageOwnApiKeys: false }),
            },
          } as any,
        },
      },
    });
    const hasPermission = await props.apiKeys!.hasPermission();

    expect(hasPermission).toBe(false);
  });
});
