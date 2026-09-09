/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProcRunner } from '@kbn/dev-proc-runner';
import { runKibanaServer as runKibanaServerImpl } from '@kbn/test-kibana-server';
import type { Config } from './configs';

export async function runKibanaServer(options: {
  procs: ProcRunner;
  config: Config;
  installDir?: string;
  extraKbnOpts?: string[];
  logsDir?: string;
  onEarlyExit?: (msg: string) => void;
}) {
  await runKibanaServerImpl({
    ...options,
    uiEphemeralDirPrefix: 'scout',
    taskRunnerEphemeralDirPrefix: 'ftr',
  });
}

export function getExtraKbnOpts(installDir: string | undefined, isServerless: boolean) {
  if (installDir) {
    return [];
  }

  return [
    '--dev',
    // Long eval runs must not be restarted by the dev file watcher: a mid-run
    // restart can fail to come back up and kills every in-flight request.
    ...(process.env.SCOUT_KBN_NO_WATCH === '1' ? ['--no-watch'] : []),
    ...(process.env.SCOUT_KBN_TRACING_UI === '1'
      ? [
          '--uiSettings.overrides.agentBuilder:tracing:enabled=true',
          '--uiSettings.overrides.agentBuilder:tracing:includeUserPrompts=true',
          '--uiSettings.overrides.agentBuilder:tracing:includeLlmResponses=true',
          '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=true',
          '--uiSettings.overrides.agentBuilder:tracing:includeSystemPrompt=true',
          '--uiSettings.overrides.agentBuilder:tracing:includeRealNames=true',
          '--uiSettings.overrides.agentBuilder:tracing:includeRealIds=true',
          '--uiSettings.overrides.agentBuilder:tracing:includeUserData=true',
        ]
      : []),
    '--no-dev-config',
    '--no-dev-credentials',
    isServerless
      ? '--server.versioned.versionResolution=newest'
      : '--server.versioned.versionResolution=oldest',
  ];
}
