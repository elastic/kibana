/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as personaMatrixConfig } from '../../evals_security_persona_matrix/stateful/classic.stateful.config';

/**
 * Parity variant of the persona-matrix server config, used only by the
 * `security-persona-matrix-parity` suite.
 *
 * Identical to `evals_security_persona_matrix` except that it does NOT set
 * `agentBuilder:experimentalFeatures=true`. That UI setting gates both `sml`
 * and context-aware skill filtering (`search_relevant_skills`). Neither existed
 * in the external benchmark whose per-model behaviour this suite reproduces
 * (its baseline never calls an `sml` tool and has no `search_relevant_skills`),
 * so enabling them here adds tool-surface noise the baseline cannot match.
 *
 * Everything else — the experimental security skills, alerting_v2, the tracing
 * config — carries over from the parent config set unchanged.
 */
export const servers: ScoutServerConfig = {
  ...personaMatrixConfig,
  kbnTestServer: {
    ...personaMatrixConfig.kbnTestServer,
    serverArgs: personaMatrixConfig.kbnTestServer.serverArgs.filter(
      (arg) => arg !== '--uiSettings.overrides.agentBuilder:experimentalFeatures=true'
    ),
  },
};
