/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '../../../types/v1';
import { buildStepExecutionId } from '../build_step_execution_id/build_step_execution_id';

const HASH_HEX_LENGTH = 32;
const HASH_HEX_REGEX = /^[a-f0-9]{32}$/;

export function generateEncodedStepExecutionId({
  executionId,
  stepId,
  stackFrames,
  indexName,
  indexPattern,
}: {
  executionId: string;
  stepId: string;
  stackFrames: StackFrame[];
  indexName: string;
  indexPattern: string;
}): string {
  if (!indexPattern.endsWith('*')) {
    throw new Error('indexPattern must end with *');
  }
  const hash = buildStepExecutionId(executionId, stepId, stackFrames);
  const indexSuffix = indexName.replace(indexPattern.slice(0, -1), '');
  const decodedId = `${indexSuffix}_${hash}`;

  return Buffer.from(decodedId)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeEncodedStepExecutionId(encodedStepExecutionId: string):
  | {
      success: true;
      indexSuffix: string;
      stepExecutionHash: string;
    }
  | { success: false; error: string } {
  const base64 = encodedStepExecutionId.replace(/-/g, '+').replace(/_/g, '/');
  const decodedId = Buffer.from(base64, 'base64').toString();

  const lastUnderscoreIndex = decodedId.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) {
    return { success: false, error: 'Invalid encoded step execution ID: missing separator' };
  }

  const indexSuffix = decodedId.slice(0, lastUnderscoreIndex);
  const hex = decodedId.slice(lastUnderscoreIndex + 1);

  if (hex.length !== HASH_HEX_LENGTH || !HASH_HEX_REGEX.test(hex)) {
    return { success: false, error: 'Invalid encoded step execution ID: malformed hash' };
  }

  return { success: true, indexSuffix, stepExecutionHash: hex };
}
