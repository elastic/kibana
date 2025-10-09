/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildkiteStep, BuildkiteGroup } from '#pipeline-utils';

type BuildkiteWaitStep = 'wait';

export interface BuildPhase {
  name: string;
  steps: BuildkiteStep[];
  dependencies?: string[];
}

/**
 * This function constructs a Buildkite Pipeline for a pull request.
 * It takes an object with a list of build phases,
 * phases may define dependencies on other phases or steps.
 * Each phase can have multiple steps that will be executed in parallel.
 * Phases will have a hard-wait between them, meaning that the next phase will not start until all steps in the previous phase have completed.
 * @param params
 */
export function constructPRPipeline(params: {
  phases: BuildPhase[];
  sharedAgentConfig?: any;
  sharedEnvConfig?: any;
}) {
  const { phases, sharedAgentConfig } = params;

  const pipeline: Array<BuildkiteStep | BuildkiteGroup | BuildkiteWaitStep> = [];

  for (const phase of phases) {
    const groupName = phase.name;

    const buildkiteGroup: BuildkiteGroup = {
      group: groupName,
      steps: phase.steps,
      depends_on: phase.dependencies,
    };

    pipeline.push(buildkiteGroup);
    pipeline.push('wait');
  }

  return {
    ...(sharedAgentConfig ? { agents: params.sharedAgentConfig } : {}),
    ...(params.sharedEnvConfig ? { env: params.sharedEnvConfig } : {}),
    steps: pipeline,
  };
}
