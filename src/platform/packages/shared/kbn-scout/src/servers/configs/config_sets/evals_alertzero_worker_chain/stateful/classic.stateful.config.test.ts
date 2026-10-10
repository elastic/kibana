/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as fpTpServers } from '../../evals_attack_discovery_fp_tp/stateful/classic.stateful.config';
import { servers } from './classic.stateful.config';

const experimentalArgs = (args: string[]) =>
  args.filter((arg) => arg.startsWith('--xpack.securitySolution.enableExperimental='));

describe('evals_alertzero_worker_chain config set', () => {
  it('registers the investigate-rule skill the Rule Tuning review pins', () => {
    expect(experimentalArgs(servers.kbnTestServer.serverArgs)).toEqual([
      '--xpack.securitySolution.enableExperimental=["investigateRuleSkill"]',
    ]);
  });

  it('keeps every arg of the attack-discovery-fp-tp set', () => {
    expect(servers.kbnTestServer.serverArgs).toEqual(
      expect.arrayContaining(fpTpServers.kbnTestServer.serverArgs)
    );
  });

  it('leaves the shared attack-discovery-fp-tp set without the flag', () => {
    expect(experimentalArgs(fpTpServers.kbnTestServer.serverArgs)).toEqual([]);
  });
});
