/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMockHoverContext, createMockStepContext } from './test_utils/mock_factories';
import { WorkflowExecuteMonacoConnectorHandler } from './workflow_execute_handler';

jest.mock('@kbn/workflows', () => ({
  getBuiltInStepStability: jest.fn().mockReturnValue(undefined),
}));

const { getBuiltInStepStability } = jest.requireMock('@kbn/workflows');

describe('WorkflowExecuteMonacoConnectorHandler', () => {
  let handler: WorkflowExecuteMonacoConnectorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new WorkflowExecuteMonacoConnectorHandler();
    getBuiltInStepStability.mockReturnValue(undefined);
  });

  describe('canHandle', () => {
    it('should handle workflow.execute', () => {
      expect(handler.canHandle('workflow.execute')).toBe(true);
    });

    it('should handle workflow.executeAsync', () => {
      expect(handler.canHandle('workflow.executeAsync')).toBe(true);
    });

    it('should not handle other types', () => {
      expect(handler.canHandle('workflow.other')).toBe(false);
      expect(handler.canHandle('elasticsearch.search')).toBe(false);
      expect(handler.canHandle('http')).toBe(false);
    });
  });

  describe('getPriority', () => {
    it('should have priority 80', () => {
      expect(handler.getPriority()).toBe(80);
    });
  });

  describe('generateHoverContent', () => {
    it('should return null when there is no step context', async () => {
      const context = createMockHoverContext('workflow.execute');
      const result = await handler.generateHoverContent(context);
      expect(result).toBeNull();
    });

    it('should return hover content for workflow.execute (synchronous)', async () => {
      const stepContext = createMockStepContext();
      const context = createMockHoverContext('workflow.execute', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('workflow.execute');
      expect(result?.value).toContain('synchronously');
      expect(result?.value).toContain('waits for the child workflow to complete');
      expect(result?.isTrusted).toBe(true);
    });

    it('should return hover content for workflow.executeAsync (asynchronous)', async () => {
      const stepContext = createMockStepContext({ stepType: 'workflow.executeAsync' });
      const context = createMockHoverContext('workflow.executeAsync', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('workflow.executeAsync');
      expect(result?.value).toContain('asynchronously');
      expect(result?.value).toContain('continues without waiting');
    });

    it('should include parameter documentation', async () => {
      const stepContext = createMockStepContext();
      const context = createMockHoverContext('workflow.execute', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('workflow-id');
      expect(result?.value).toContain('inputs');
      expect(result?.value).toContain('required');
      expect(result?.value).toContain('optional');
    });

    it('should include an example section', async () => {
      const stepContext = createMockStepContext();
      const context = createMockHoverContext('workflow.execute', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('Example');
      expect(result?.value).toContain('run_child');
      expect(result?.value).toContain('my-other-workflow');
    });

    it('should include stability note when step has stability info', async () => {
      getBuiltInStepStability.mockReturnValue('tech_preview');

      const stepContext = createMockStepContext();
      const context = createMockHoverContext('workflow.execute', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('Tech Preview');
    });

    it('should not include stability note when stability is GA or undefined', async () => {
      getBuiltInStepStability.mockReturnValue(undefined);

      const stepContext = createMockStepContext();
      const context = createMockHoverContext('workflow.execute', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).not.toContain('Technical Preview');
      expect(result?.value).not.toContain('Beta');
    });
  });

  describe('getExamples', () => {
    it('should return examples for workflow.execute', () => {
      const result = handler.getExamples('workflow.execute');
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({
        'workflow-id': 'my-other-workflow',
        inputs: { key: 'value' },
      });
      expect(result?.snippet).toContain('type: workflow.execute');
      expect(result?.snippet).toContain('workflow-id: my-other-workflow');
    });

    it('should return examples for workflow.executeAsync', () => {
      const result = handler.getExamples('workflow.executeAsync');
      expect(result).not.toBeNull();
      expect(result?.snippet).toContain('type: workflow.executeAsync');
    });
  });
});
