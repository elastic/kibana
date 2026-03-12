/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';

interface EmitPipelineOptions {
  debug?: boolean;
}

export function emitPipeline(pipelineSteps: string[], options: EmitPipelineOptions = {}) {
  const pipelineStr = [...new Set(pipelineSteps)].join('\n');
  if (options.debug) {
    console.warn('debug:', pipelineSteps);
  }
  console.log(pipelineStr);
}

export const getPipeline = (filename: string, removeSteps = true) => {
  const str = fs.readFileSync(filename).toString();
  return removeSteps ? str.replace(/^steps:/, '') : str;
};
