/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';

describe('evals_detection_watch_rule_creation config set', () => {
  it('enables service accounts so alertzero installs its managed workflows (#295215)', () => {
    expect(servers.kbnTestServer.serverArgs).toContain(
      '--xpack.security.serviceAccounts.enabled=true'
    );
  });

  it('enables alertzero and both of its required plugins', () => {
    expect(servers.kbnTestServer.serverArgs).toEqual(
      expect.arrayContaining([
        '--xpack.alertzero.enabled=true',
        '--xpack.agenticInvestigations.enabled=true',
        '--xpack.proposals.enabled=true',
      ])
    );
  });
});
