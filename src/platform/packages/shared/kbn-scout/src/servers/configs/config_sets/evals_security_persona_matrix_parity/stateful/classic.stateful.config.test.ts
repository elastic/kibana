/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. Licensed under Elasticsearch B.V. under the Elastic License 2.0; you may not
 * use this file except in compliance with the Elastic License 2.0.
 */

import { servers } from './classic.stateful.config';
import { servers as personaMatrixConfig } from '../../evals_security_persona_matrix/stateful/classic.stateful.config';

const EXPERIMENTAL_FEATURES_ARG = '--uiSettings.overrides.agentBuilder:experimentalFeatures=true';

describe('evals_security_persona_matrix_parity config set', () => {
  it('opts out of agentBuilder:experimentalFeatures', () => {
    expect(servers.kbnTestServer.serverArgs).not.toContain(EXPERIMENTAL_FEATURES_ARG);
  });

  it('differs from the parent persona-matrix config only by that opt-out', () => {
    // Guards the premise of the fork: one arg difference, nothing else.
    expect(personaMatrixConfig.kbnTestServer.serverArgs).toContain(EXPERIMENTAL_FEATURES_ARG);
    expect(servers.kbnTestServer.serverArgs).toEqual(
      personaMatrixConfig.kbnTestServer.serverArgs.filter(
        (arg) => arg !== EXPERIMENTAL_FEATURES_ARG
      )
    );
  });
});
