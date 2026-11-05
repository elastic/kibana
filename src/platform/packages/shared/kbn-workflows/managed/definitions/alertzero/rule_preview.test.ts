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
  // The preview simulates the rule several times and each run reports the same failure
  // again, so the flattened text has to list every distinct error once.
  describe.each([
    ['collect_errors', 'preview_rule'],
    ['collect_proposed_errors', 'preview_proposed'],
  ])('%s', (collectStep, previewStep) => {
    it('lists an error that every simulated run reports once', () => {
      const logs = [
        {
          errors: [
            'parsing_exception: pattern too complex',
            'parsing_exception: pattern too complex',
          ],
        },
        { errors: ['parsing_exception: pattern too complex'] },
        { errors: ['parsing_exception: pattern too complex'] },
      ];

      expect(renderErrorText(collectStep, previewStep, logs)).toBe(
        'parsing_exception: pattern too complex; '
      );
    });

    it('keeps distinct errors in the order they first appear', () => {
      const logs = [
        { errors: ['first failure'] },
        { errors: ['second failure', 'first failure'] },
        { errors: ['third failure'] },
      ];

      expect(renderErrorText(collectStep, previewStep, logs)).toBe(
        'first failure; second failure; third failure; '
      );
    });

    it('counts only the no-matching-indices warning, once, next to the errors', () => {
      const logs = [
        {
          errors: [],
          warnings: ['Unable to find matching indices for rule x', 'some other warning'],
        },
        { warnings: ['Unable to find matching indices for rule x'] },
      ];

      expect(renderErrorText(collectStep, previewStep, logs)).toBe(
        'Unable to find matching indices for rule x; '
      );
    });

    it('stays empty when no run reports anything, which is what marks a preview succeeded', () => {
      expect(renderErrorText(collectStep, previewStep, [])).toBe('');
      expect(renderErrorText(collectStep, previewStep, [{ errors: [], warnings: ['noise'] }])).toBe(
        ''
      );
    });
  });
});
