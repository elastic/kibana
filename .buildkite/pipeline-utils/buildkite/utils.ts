/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import { load as loadYaml } from 'js-yaml';

export function emitPipeline(pipelineSteps: string[]) {
  const pipelineStr = [...new Set(pipelineSteps)].join('\n');
  console.log(pipelineStr);
}

export interface GetPipelineOptions {
  removeSteps?: boolean;
  cancelOnGateFailure?: boolean;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

/**
 * Extracts cancelable step keys from a parsed pipeline YAML document.
 * For group steps, recurses into child steps instead of registering the
 * group key (buildkite-agent step cancel does not work on group keys).
 * Throws if any command step is missing a key.
 */
function extractStepKeys(filename: string, doc: unknown): string[] {
  if (!isObj(doc) || !Array.isArray(doc.steps)) {
    throw new Error(`${filename}: expected a YAML document with a "steps" array`);
  }

  const keys: string[] = [];

  for (const step of doc.steps) {
    if (!isObj(step)) continue;

    // Group step: recurse into child steps instead of registering the group key
    if (typeof step.group === 'string' && Array.isArray(step.steps)) {
      for (const child of step.steps) {
        if (!isObj(child)) continue;

        if (typeof child.key === 'string') {
          keys.push(child.key);
        } else {
          const label = String(child.label ?? child.command ?? 'unknown');
          throw new Error(
            `${filename}: group "${step.group}" child step "${label}" is missing a "key" (required for cancelOnGateFailure)`
          );
        }
      }
      continue;
    }

    if (typeof step.key === 'string') {
      keys.push(step.key);
    } else {
      const label = String(step.label ?? step.group ?? step.command ?? 'unknown');
      throw new Error(
        `${filename}: step "${label}" is missing a "key" (required for cancelOnGateFailure)`
      );
    }
  }

  return keys;
}

function registerCancelOnGateFailureMetadata(keys: string[]) {
  for (const key of keys) {
    execFileSync('buildkite-agent', ['meta-data', 'set', `cancel_on_gate_failure:${key}`, 'true']);
  }
}

export const getPipeline = (filename: string, options?: boolean | GetPipelineOptions) => {
  const opts: GetPipelineOptions =
    typeof options === 'boolean' ? { removeSteps: options } : { removeSteps: true, ...options };

  const str = fs.readFileSync(filename).toString();

  if (opts.cancelOnGateFailure) {
    const doc = loadYaml(str);
    const keys = extractStepKeys(filename, doc);
    registerCancelOnGateFailureMetadata(keys);
  }

  return opts.removeSteps ? str.replace(/^steps:/, '') : str;
};
