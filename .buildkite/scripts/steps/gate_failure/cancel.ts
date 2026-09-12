/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteClient } from '#pipeline-utils';

const BATCH_PREFIX = 'cancel_on_gate_failure_batch:';

function run(): void {
  // Separate the raw env value from the display fallback: selfKey drives the
  // filter predicate, so 'unknown' must not silently spare a step keyed that way.
  const selfKey = process.env.BUILDKITE_STEP_KEY;
  const gateStepKey = selfKey ?? 'unknown';
  const gateLabel = process.env.BUILDKITE_LABEL ?? gateStepKey;
  // Include the gate step key in the annotation context so multiple gate failures
  // each get their own annotation instead of overwriting each other.
  const annotationContext = `cancel-on-gate-failure:${gateStepKey}`;

  const bk = new BuildkiteClient();

  const allStepKeys = [
    ...new Set(
      bk
        .getMetadataKeys()
        .filter((key) => key.startsWith(BATCH_PREFIX))
        .flatMap((key) => {
          const value = bk.getMetadata(key);
          try {
            return value ? (JSON.parse(value) as string[]) : [];
          } catch {
            return [];
          }
        })
    ),
  ];

  // Never cancel the step that is running this cascade. Doing so kills the
  // post-command hook mid-loop, changes the step's recorded state from
  // "failed" to "canceled" (hiding the real failure), and prevents the final
  // annotation from being written.
  // check_oas_snapshot is registered this way today via pipeline.ts: it should
  // be cancelable by other gate failures, but must not cancel itself.
  const skipsSelf = Boolean(selfKey) && allStepKeys.includes(selfKey!);
  const stepKeys = selfKey ? allStepKeys.filter((k) => k !== selfKey) : allStepKeys;

  if (stepKeys.length === 0) {
    return;
  }

  const selfNote = skipsSelf
    ? `**Note:** **${gateStepKey}** was registered as cancelable but was not canceled to preserve its exit status.`
    : '';

  // Write an initial annotation before the loop so that even a truncated run
  // (e.g., from an unrelated signal) leaves a readable breadcrumb in the build UI.
  bk.setAnnotation(
    annotationContext,
    'info',
    [`Check gate **${gateLabel}** failed. Canceling ${stepKeys.length} step(s)...`, selfNote]
      .filter(Boolean)
      .join('\n\n')
  );

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

  const canceledDetails = canceled.length
    ? [
        '<details><summary>Canceled step keys</summary>',
        '',
        ...canceled.map((stepKey) => `- ${stepKey}`),
        '',
        '</details>',
        '',
      ]
    : [];
  const skippedDetails = skipped.length
    ? [
        `Already finished: ${skipped.length} step(s).`,
        '<details><summary>Already-finished step keys</summary>',
        '',
        ...skipped.map((stepKey) => `- ${stepKey}`),
        '',
        '</details>',
        '',
      ]
    : [];
  const summary = [
    `Check gate **${gateLabel}** failed.`,
    `Canceled ${canceled.length} step(s).`,
    ...canceledDetails,
    ...skippedDetails,
    ...(failures.length ? ['Failed to cancel:', ...failures.map((line) => `- ${line}`)] : []),
    ...(selfNote ? [selfNote] : []),
  ].join('\n');

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
