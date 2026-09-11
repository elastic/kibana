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
import { parse as loadYaml } from 'yaml';

export function emitPipeline(pipelineSteps: string[], debug = false) {
  const pipelineStr = [...new Set(pipelineSteps)].join('\n');

  if (debug) {
    console.warn('Emitting pipeline:\n', pipelineStr);
  }

  console.log(pipelineStr);
}

export interface GetPipelineOptions {
  removeSteps?: boolean;
  cancelOnGateFailure?: boolean;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isCommandStep(step: Record<string, unknown>): step is Record<string, unknown> & {
  command: string;
} {
  return typeof step.command === 'string';
}

function getSteps(filename: string, doc: unknown): unknown[] {
  if (!isObj(doc)) {
    throw new Error(`${filename}: expected a YAML document with a "steps" array`);
  }

  if (doc.steps == null) {
    return [];
  }

  if (!Array.isArray(doc.steps)) {
    throw new Error(`${filename}: expected a YAML document with a "steps" array`);
  }

  return doc.steps;
}

/**
 * Extracts cancelable step keys from a parsed pipeline YAML document.
 * For group steps, recurses into child steps instead of registering the
 * group key (buildkite-agent step cancel does not work on group keys).
 * Throws if any command step is missing a key.
 */
function extractStepKeys(filename: string, doc: unknown): string[] {
  const keys: string[] = [];
  const steps = getSteps(filename, doc);

  for (const step of steps) {
    if (!isObj(step)) continue;

    // Group step: recurse into child steps instead of registering the group key
    if (typeof step.group === 'string' && Array.isArray(step.steps)) {
      for (const child of step.steps) {
        if (!isObj(child)) continue;

        if (!isCommandStep(child)) {
          continue;
        }

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

    if (!isCommandStep(step)) {
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

const pendingCancelKeys: string[] = [];

function registerCancelOnGateFailureMetadata(keys: string[]) {
  pendingCancelKeys.push(...keys);
}

export function registerCancelKeys(keys: string[]) {
  pendingCancelKeys.push(...keys);
}

export function flushCancelOnGateFailureMetadata() {
  if (pendingCancelKeys.length === 0) return;
  execFileSync('buildkite-agent', ['meta-data', 'set', 'cancel_on_gate_failure_batch:pipeline'], {
    input: JSON.stringify(pendingCancelKeys),
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  pendingCancelKeys.length = 0;
}

/** @internal Exposed only for tests */
export function _resetPendingCancelKeys() {
  pendingCancelKeys.length = 0;
}

/**
 * Step conditionals such as `build.env('GITHUB_PR_TARGET_BRANCH') == 'main'` are evaluated
 * by Buildkite at pipeline *upload* time against the build's environment, which a job-level
 * export cannot change. For a stacked PR that env var holds the PR's direct base — a sibling
 * feature branch — so those steps drop out even though the change is headed for main.
 *
 * Rewriting the expression into the branch we resolved is therefore the only point where the
 * gate's intent can still be honoured. Left unset (every non-stacked PR), the emitted YAML is
 * byte-identical to what ships today.
 */
const TARGET_BRANCH_EXPRESSION = /build\.env\(['"]GITHUB_PR_TARGET_BRANCH['"]\)/g;

// A branch name that survives round-tripping into a single-quoted Buildkite string literal.
const QUOTABLE_BRANCH = /^[\w.\-/]+$/;

let effectiveTargetBranch: string | undefined;

/**
 * Records the branch a stacked PR is ultimately headed for, so step conditionals are
 * evaluated against it instead of the intermediate branch the PR directly targets.
 * Anything unquotable is ignored rather than escaped — a branch name needing escapes is
 * far more likely to be a bug than a real branch, and ignoring it restores today's behaviour.
 */
export function setEffectiveTargetBranch(branch: string | undefined) {
  effectiveTargetBranch =
    branch && QUOTABLE_BRANCH.test(branch) && branch !== process.env.GITHUB_PR_TARGET_BRANCH
      ? branch
      : undefined;
}

/** @internal Exposed only for tests */
export function _resetEffectiveTargetBranch() {
  effectiveTargetBranch = undefined;
}

export function applyEffectiveTargetBranch(yaml: string): string {
  if (!effectiveTargetBranch) {
    return yaml;
  }

  return yaml.replace(TARGET_BRANCH_EXPRESSION, `'${effectiveTargetBranch}'`);
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

  const yaml = applyEffectiveTargetBranch(str);

  return opts.removeSteps ? yaml.replace(/^steps:/, '') : yaml;
};
