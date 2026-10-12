/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';

describe('alertzero_e2e config set', () => {
  const args = servers.kbnTestServer.serverArgs;

  it('enables alertzero and the plugins it requires', () => {
    expect(args).toEqual(
      expect.arrayContaining([
        '--xpack.alertzero.enabled=true',
        '--xpack.agenticInvestigations.enabled=true',
        '--xpack.proposals.enabled=true',
      ])
    );
  });

  it('enables service accounts so alertzero installs its managed workflows', () => {
    expect(args).toContain('--xpack.security.serviceAccounts.enabled=true');
  });

  it('keeps the EIS preconfigured connectors from the agent_builder_smoke base', () => {
    expect(args.some((arg) => arg.startsWith('--xpack.actions.preconfigured='))).toBe(true);
  });
});
