/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApmSynthtracePipelines } from '../../lib/apm/client/apm_synthtrace_es_client';

const validPipelines: ApmSynthtracePipelines[] = ['apmToOtel', 'otelToApm', 'default'];
const parseApmPipeline = (value: ApmSynthtracePipelines): ApmSynthtracePipelines => {
  if (!value) return 'default';

  if (validPipelines.includes(value)) {
    return value;
  } else {
    return 'default';
  }
};

export interface ApmPipelineScenarioOpts {
  pipeline: ApmSynthtracePipelines;
  numServices?: number;
}

export const parseApmScenarioOpts = (
  scenarioOpts: Record<string, any> | undefined
): ApmPipelineScenarioOpts => {
  const pipeline = parseApmPipeline(scenarioOpts?.pipeline);
  const numServices = scenarioOpts?.numServices ? Number(scenarioOpts.numServices) : undefined;

  return {
    ...scenarioOpts,
    pipeline,
    numServices,
  };
};
