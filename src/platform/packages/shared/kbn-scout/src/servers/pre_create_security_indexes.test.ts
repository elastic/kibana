/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { createSamlSessionManager } from '../common';
import { Config } from './configs/config';
import { servers } from './configs/config_sets/default/serverless/security_complete.serverless.config';
import { preCreateSecurityIndexesViaSamlAuth } from './pre_create_security_indexes';

jest.mock('../common', () => ({
  createSamlSessionManager: jest.fn(),
  ScoutLogger: jest.fn(),
}));

describe('preCreateSecurityIndexesViaSamlAuth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('warms up Security indexes through SAML by default', async () => {
    const config = new Config(servers);
    const session = {
      getInteractiveUserSessionCookieWithRoleScope: jest.fn().mockResolvedValue('cookie'),
    };
    (createSamlSessionManager as jest.Mock).mockReturnValue(session);

    await preCreateSecurityIndexesViaSamlAuth(config, new ToolingLog());

    expect(session.getInteractiveUserSessionCookieWithRoleScope).toHaveBeenCalledWith('admin');
  });

  it('allows bearer-only suites to disable SAML warmup', async () => {
    const config = new Config({ ...servers, preCreateSecurityIndexes: false });

    await preCreateSecurityIndexesViaSamlAuth(config, new ToolingLog());

    expect(createSamlSessionManager).not.toHaveBeenCalled();
  });
});
