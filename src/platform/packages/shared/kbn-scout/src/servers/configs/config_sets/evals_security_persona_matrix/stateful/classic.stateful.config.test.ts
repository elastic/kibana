/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';
import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';

const MAX_PAYLOAD_PREFIX = '--server.maxPayload=';
const maxPayloadArgs = (args: string[]) => args.filter((arg) => arg.startsWith(MAX_PAYLOAD_PREFIX));

describe('evals_security_persona_matrix config set', () => {
  it('raises server.maxPayload to 50MB, exactly once', () => {
    expect(maxPayloadArgs(servers.kbnTestServer.serverArgs)).toEqual([
      '--server.maxPayload=52428800',
    ]);
  });

  it('does not leave the inherited lower cap in the args', () => {
    // Guards the premise: the parent config still pins a lower cap that must not survive.
    expect(maxPayloadArgs(evalsTracingConfig.kbnTestServer.serverArgs).length).toBeGreaterThan(0);
    for (const inherited of maxPayloadArgs(evalsTracingConfig.kbnTestServer.serverArgs)) {
      expect(servers.kbnTestServer.serverArgs).not.toContain(inherited);
    }
  });

  it('keeps every other inherited arg', () => {
    const inherited = evalsTracingConfig.kbnTestServer.serverArgs.filter(
      (arg) => !arg.startsWith(MAX_PAYLOAD_PREFIX)
    );
    expect(servers.kbnTestServer.serverArgs).toEqual(expect.arrayContaining(inherited));
  });
});
