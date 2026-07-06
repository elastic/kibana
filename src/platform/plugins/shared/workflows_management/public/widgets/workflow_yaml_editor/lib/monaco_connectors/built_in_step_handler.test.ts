/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuiltInStepMonacoHandler } from './built_in_step_handler';
import { createMockHoverContext, createMockStepContext } from './test_utils/mock_factories';
import { setMockStabilityBadgeThemeForTests } from '../stability/set_mock_stability_badge_theme_for_tests';

describe('BuiltInStepMonacoHandler', () => {
  let handler: BuiltInStepMonacoHandler;

  beforeEach(() => {
    setMockStabilityBadgeThemeForTests();
    handler = new BuiltInStepMonacoHandler();
  });

  describe('canHandle', () => {
    it.each([
      'wait',
      'waitForInput',
      'workflow.execute',
      'workflow.executeAsync',
      'workflow.fail',
      'workflow.output',
      'parallel',
      'merge',
      'if',
      'foreach',
    ])('handles built-in step type "%s"', (type) => {
      expect(handler.canHandle(type)).toBe(true);
    });

    it.each(['slack.postMessage', 'elasticsearch.search', 'http', 'unknown.step'])(
      'does not handle non-built-in type "%s"',
      (type) => {
        expect(handler.canHandle(type)).toBe(false);
      }
    );
  });

  describe('generateHoverContent', () => {
    it('returns null when there is no step context', async () => {
      const result = await handler.generateHoverContent(createMockHoverContext('wait'));
      expect(result).toBeNull();
    });

    it('renders the step label and description without the word "connector"', async () => {
      const context = createMockHoverContext(
        'workflow.fail',
        createMockStepContext({ stepType: 'workflow.fail' })
      );
      const result = await handler.generateHoverContent(context);
      expect(result).not.toBeNull();
      expect(result!.value).toContain('**Step**: `workflow.fail`');
      expect(result!.value).toContain('Fail Workflow');
      expect(result!.value).toContain('Terminate the workflow with a failed status');
      expect(result!.value).not.toMatch(/connector/i);
      expect(result!.value).not.toMatch(/AI\/ML/i);
      expect(result!.value).not.toMatch(/Common Parameters/);
    });

    it('renders the first example under a fenced yaml block', async () => {
      const context = createMockHoverContext(
        'workflow.execute',
        createMockStepContext({ stepType: 'workflow.execute' })
      );
      const result = await handler.generateHoverContent(context);
      expect(result!.value).toContain('**Example:**');
      expect(result!.value).toContain('```yaml');
      expect(result!.value).toContain('type: workflow.execute');
    });

    it('shows a tech preview badge for tech-preview built-ins', async () => {
      const context = createMockHoverContext(
        'workflow.execute',
        createMockStepContext({ stepType: 'workflow.execute' })
      );
      const result = await handler.generateHoverContent(context);
      // Stability badge (rendered as inline svg image) precedes the step line.
      expect(result!.value.indexOf('<img src="data:image/svg+xml,')).toBeLessThan(
        result!.value.indexOf('**Step**')
      );
    });

    it('renders parallel and merge with their real descriptions', async () => {
      const parallelResult = await handler.generateHoverContent(
        createMockHoverContext('parallel', createMockStepContext({ stepType: 'parallel' }))
      );
      expect(parallelResult!.value).toContain('Run multiple named branches');

      const mergeResult = await handler.generateHoverContent(
        createMockHoverContext('merge', createMockStepContext({ stepType: 'merge' }))
      );
      expect(mergeResult!.value).toContain('Wait for the referenced parallel branches');
    });
  });

  describe('getExamples', () => {
    it('returns the first documentation example as a snippet', () => {
      const result = handler.getExamples('workflow.fail');
      expect(result?.snippet).toContain('type: workflow.fail');
    });

    it('returns null for unknown types', () => {
      expect(handler.getExamples('unknown.step')).toBeNull();
    });
  });
});
