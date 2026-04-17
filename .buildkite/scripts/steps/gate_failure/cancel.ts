/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteClient } from '#pipeline-utils';

const METADATA_PREFIX = 'cancel_on_gate_failure:';

function run(): void {
  const bk = new BuildkiteClient();

  // Discover cancelable step keys from metadata set at pipeline upload time
  const stepKeys = bk
    .getMetadataKeys()
    .filter((key) => key.startsWith(METADATA_PREFIX))
    .map((key) => key.slice(METADATA_PREFIX.length));

  if (stepKeys.length === 0) {
    return;
  }

  const canceled: string[] = [];
  const skipped: string[] = [];
  const failures: string[] = [];

  for (const stepKey of stepKeys) {
    try {
      bk.cancelStep(stepKey);
      canceled.push(stepKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stderr =
        error instanceof Error && 'stderr' in error
          ? String((error as NodeJS.ErrnoException & { stderr: unknown }).stderr)
          : '';
      const combined = `${message}\n${stderr}`;
      // Steps that already finished (passed, failed, canceled) cannot be canceled again.
      // This is expected in race conditions and not a real failure. We check both the
      // error message and stderr to be resilient to CLI wording changes.
      if (/already (finished|been canceled)|not found|cannot cancel/i.test(combined)) {
        skipped.push(stepKey);
      } else {
        failures.push(`${stepKey}: ${message}`);
      }
    }
  }

  const gateStepKey = process.env.BUILDKITE_STEP_KEY ?? 'unknown';
  const gateLabel = process.env.BUILDKITE_LABEL ?? gateStepKey;
  const summary = [
    `Check gate **${gateLabel}** failed.`,
    `Canceled ${canceled.length} step(s): ${canceled.length ? canceled.join(', ') : 'none'}`,
    ...(skipped.length ? [`Already finished: ${skipped.join(', ')}`] : []),
    ...(failures.length ? ['Failed to cancel:', ...failures.map((line) => `- ${line}`)] : []),
  ].join('\n');

  // Include the gate step key in the annotation context so multiple gate failures
  // each get their own annotation instead of overwriting each other.
  const annotationContext = `cancel-on-gate-failure:${gateStepKey}`;
  bk.setAnnotation(annotationContext, failures.length ? 'warning' : 'info', summary);

  if (failures.length > 0) {
    throw new Error('Some steps could not be canceled');
  }
}

try {
  run();
} catch (error) {
  console.error('Cancel-on-gate-failure failed:', error);
  process.exit(1);
}
