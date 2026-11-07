/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_RULE_PREVIEW_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface YamlStep {
  name: string;
  with?: Record<string, unknown>;
}

const { steps } = parse(ALERTZERO_RULE_PREVIEW_WORKFLOW.yaml) as { steps: YamlStep[] };

const renderErrorText = (collectStep: string, previewStep: string, logs: unknown[]): string => {
  const { with: params } = steps.find(({ name }) => name === collectStep) ?? {};
  return createWorkflowLiquidEngine().parseAndRenderSync(String(params?.error_text), {
    steps: { [previewStep]: { output: { logs } } },
  });
};

describe('rule preview workflow', () => {
  // Every simulated run reports the same failure again, so each distinct error is
  // listed once, in the order it first appears. Only the no-matching-indices warning
  // counts as an error.
  it.each([
    ['collect_errors', 'preview_rule'],
    ['collect_proposed_errors', 'preview_proposed'],
  ])('%s lists each distinct error once', (collectStep, previewStep) => {
    const logs = [
      {
        errors: ['first failure', 'first failure'],
        warnings: ['Unable to find matching indices', 'noise'],
      },
      {
        errors: ['second failure', 'first failure'],
        warnings: ['Unable to find matching indices'],
      },
    ];

    expect(renderErrorText(collectStep, previewStep, logs)).toBe(
      'first failure; Unable to find matching indices; second failure; '
    );
    expect(renderErrorText(collectStep, previewStep, [{ warnings: ['noise'] }])).toBe('');
  });
});
