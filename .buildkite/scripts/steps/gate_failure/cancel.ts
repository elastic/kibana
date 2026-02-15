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
const ANNOTATION_CONTEXT = 'cancel-on-gate-failure';

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
  const failures: string[] = [];

  for (const stepKey of stepKeys) {
    try {
      bk.cancelStep(stepKey);
      canceled.push(stepKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${stepKey}: ${message}`);
    }
  }

  const gateLabel = process.env.BUILDKITE_LABEL ?? process.env.BUILDKITE_STEP_KEY ?? 'unknown';
  const summary = [
    `Check gate **${gateLabel}** failed.`,
    `Canceled ${canceled.length} step(s): ${canceled.length ? canceled.join(', ') : 'none'}`,
    ...(failures.length ? ['Failed to cancel:', ...failures.map((line) => `- ${line}`)] : []),
  ].join('\n');

  bk.setAnnotation(ANNOTATION_CONTEXT, failures.length ? 'warning' : 'info', summary);

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
