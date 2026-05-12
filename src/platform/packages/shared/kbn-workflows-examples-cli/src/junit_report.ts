/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValidationOutcome } from './validate_example';

export interface ExampleResult {
  readonly name: string;
  readonly file: string;
  readonly durationSeconds: number;
  readonly outcome: ValidationOutcome;
}

const CONTROL_CHAR_RE = /[\x00-\x1F]+/g;

export function renderJUnitXml(results: readonly ExampleResult[]): string {
  const failures = results.filter((r) => r.outcome.kind !== 'ok').length;
  const totalSeconds = results.reduce((sum, r) => sum + r.durationSeconds, 0);

  const cases = results.map(renderTestcase).join('');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites tests="${results.length}" failures="${failures}" time="${totalSeconds.toFixed(
      3
    )}">\n` +
    `  <testsuite name="workflows-examples" tests="${
      results.length
    }" failures="${failures}" time="${totalSeconds.toFixed(3)}">\n` +
    cases +
    `  </testsuite>\n` +
    `</testsuites>\n`
  );
}

function renderTestcase(result: ExampleResult): string {
  const attrs =
    `name="${escapeAttr(result.name)}" ` +
    `classname="${escapeAttr(result.file)}" ` +
    `time="${result.durationSeconds.toFixed(3)}"`;
  if (result.outcome.kind === 'ok') {
    return `    <testcase ${attrs}/>\n`;
  }
  const failure = renderFailureBody(result.outcome);
  return `    <testcase ${attrs}>\n${failure}    </testcase>\n`;
}

function renderFailureBody(outcome: Exclude<ValidationOutcome, { kind: 'ok' }>): string {
  switch (outcome.kind) {
    case 'oversize':
      return `      <failure type="oversize" message="${escapeAttr(
        `Example exceeds MAX_WORKFLOW_YAML_LENGTH (${outcome.bytes} > ${outcome.limit} bytes)`
      )}"/>\n`;
    case 'syntax-error':
      return `      <failure type="syntax-error" message="${escapeAttr(outcome.message)}"/>\n`;
    case 'schema-error': {
      const detail = outcome.issues.map((i) => `${i.path}: ${i.message}`).join('\n');
      return `      <failure type="schema-error" message="${escapeAttr(
        `${outcome.issues.length} schema issue(s)`
      )}">${escapeText(detail)}</failure>\n`;
    }
    case 'unexpected-error':
      return `      <failure type="unexpected-error" message="${escapeAttr(outcome.message)}"/>\n`;
  }
}

function escapeAttr(value: string): string {
  return value
    .replace(CONTROL_CHAR_RE, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
  return value
    .replace(CONTROL_CHAR_RE, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
