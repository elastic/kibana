/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import yaml from 'js-yaml';
import { BuildkiteGroup, BuildkiteStep } from '#pipeline-utils/buildkite/client';

export function emitPipeline(pipelineSteps: string[]) {
  const pipelineStr = [...new Set(pipelineSteps)].join('\n');
  console.log(pipelineStr);
}

export function emitPipelineObject(pipelineObject: {
  [key: string]: any;
  steps?: Array<BuildkiteStep | BuildkiteGroup | 'wait'>;
  agents?: any;
  env?: any;
}) {
  const pipelineStr = yaml.dump(pipelineObject, { lineWidth: -1 });
  console.log(pipelineStr);
}
