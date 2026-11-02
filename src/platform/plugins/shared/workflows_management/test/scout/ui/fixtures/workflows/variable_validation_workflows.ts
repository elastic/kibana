/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Builds a minimal valid workflow YAML whose console step `message` field
 * is the given `messageField` value (including YAML quoting/block indicators).
 */
function workflowWithMessage(messageField: string): string {
  return `name: Var Scope Test
enabled: false
triggers:
  - type: manual
steps:
  - name: test_step
    type: console
    with:
      message: ${messageField}`;
}

/**
 * Wraps content lines as a YAML block literal (`|`) indented 8 spaces
 * (two levels deeper than the `message:` key at column 6).
 */
function blockLiteral(lines: string[]): string {
  return `|\n${lines.map((l) => `        ${l}`).join('\n')}`;
}

// ---------------------------------------------------------------------------
// assign — same-line (quoted scalar)
// ---------------------------------------------------------------------------

export const getAssignAfterUseSameLine = () => workflowWithMessage('"{{ x }}{% assign x = 1 %}"');

export const getAssignBeforeUseSameLine = () => workflowWithMessage('"{% assign x = 1 %}{{ x }}"');

// ---------------------------------------------------------------------------
// capture — same-line (quoted scalar)
// ---------------------------------------------------------------------------

export const getCaptureAfterUseSameLine = () =>
  workflowWithMessage('"{{ cap }}{% capture cap %}body{% endcapture %}"');

export const getCaptureBeforeUseSameLine = () =>
  workflowWithMessage('"{% capture cap %}body{% endcapture %}{{ cap }}"');

// ---------------------------------------------------------------------------
// assign — cross-line (block scalar)
// ---------------------------------------------------------------------------

export const getAssignAfterUseCrossLine = () =>
  workflowWithMessage(blockLiteral(['{{ x }}', '{% assign x = 1 %}']));

export const getAssignBeforeUseCrossLine = () =>
  workflowWithMessage(blockLiteral(['{% assign x = 1 %}', '{{ x }}']));

// ---------------------------------------------------------------------------
// capture — cross-line (block scalar)
// ---------------------------------------------------------------------------

export const getCaptureAfterUseCrossLine = () =>
  workflowWithMessage(blockLiteral(['{{ cap }}', '{% capture cap %}body{% endcapture %}']));

export const getCaptureBeforeUseCrossLine = () =>
  workflowWithMessage(blockLiteral(['{% capture cap %}body{% endcapture %}', '{{ cap }}']));

// ---------------------------------------------------------------------------
// mixed: assign in scope + capture out of scope — same-line
// ---------------------------------------------------------------------------

export const getMixedAssignAndCaptureSameLine = () =>
  workflowWithMessage('"{% assign a = 1 %}{{ a }}{{ cap }}{% capture cap %}body{% endcapture %}"');

// ---------------------------------------------------------------------------
// multiple assigns interleaved — cross-line (block scalar)
// ---------------------------------------------------------------------------

export const getMultipleAssignsInterleaved = () =>
  workflowWithMessage(
    blockLiteral(['{% assign a = 1 %}', '{{ a }}{{ b }}', '{% assign b = 2 %}', '{{ a }}{{ b }}'])
  );

// ---------------------------------------------------------------------------
// capture use-before-declaration, then valid use after — cross-line
// ---------------------------------------------------------------------------

export const getCaptureUsedBeforeAndAfter = () =>
  workflowWithMessage(
    blockLiteral(['{{ cap }}', '{% capture cap %}body{% endcapture %}', '{{ cap }}'])
  );
