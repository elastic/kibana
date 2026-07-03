/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';

export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        'automaticTroubleshootingSkill',
        'endpointForensicAnalysisSkill',
      ])}`,
      '--xpack.fleet.packages.0.name=endpoint',
      '--xpack.fleet.packages.0.version=latest',
      // Agent Builder inference/tool spans (load_skill, filestore.read of SKILL.md) reach ES for the
      // L1 "Skill Invoked" evaluator via the inherited `evals_tracing` platform wiring: telemetry.tracing
      // is enabled there, and register_tracing.ts always attaches an ElasticsearchOtlpExporter plus a
      // GlobalBridgeProcessor into the platform pipeline, so agent spans nest under the incoming HTTP
      // request trace and share its trace.id. Do NOT re-add `xpack.agentBuilder.tracing.exporters` here:
      // configuring a dedicated agent-builder exporter forks agent spans into a separate root trace,
      // detaching them from the HTTP trace the evaluator queries (Skill Invoked -> 0).
    ],
  },
};
