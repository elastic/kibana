/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowYaml } from '@kbn/workflows';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import { executeWorkflowSync } from './execute_workflow_sync';
import type { WorkflowCheckpoint } from './execute_workflow_sync';

const logger = loggingSystemMock.createLogger();

/** Minimal step definition that echoes its `value` input as `output`. */
const echoStep: ServerStepDefinition = {
  id: 'test.echo',
  label: 'test',
  description: 'test',
  category: 'test' as never,
  inputSchema: {} as never,
  outputSchema: {} as never,
  handler: async (ctx) => ({ output: { result: (ctx.input as { value: string }).value } }),
};

/** Step that always throws. */
const failStep: ServerStepDefinition = {
  id: 'test.fail',
  label: 'test',
  description: 'test',
  category: 'test' as never,
  inputSchema: {} as never,
  outputSchema: {} as never,
  handler: async () => {
    throw new Error('step error');
  },
};

const getStepDefinition = (type: string): ServerStepDefinition | undefined => {
  if (type === 'test.echo') return echoStep;
  if (type === 'test.fail') return failStep;
  return undefined;
};

const makeWorkflow = (
  yaml: Partial<WorkflowYaml> & { steps: WorkflowYaml['steps'] }
): WorkflowYaml => ({ version: '1', name: 'test', ...yaml } as WorkflowYaml);

describe('executeWorkflowSync', () => {
  describe('normal (non-around) execution', () => {
    it('runs steps and returns workflow.output values', async () => {
      const result = await executeWorkflowSync({
        workflowDefinition: makeWorkflow({
          steps: [
            { name: 'greet', type: 'test.echo', with: { value: 'hello' } } as never,
            {
              name: 'emit',
              type: 'workflow.output',
              with: { greeting: '{{ steps.greet.output.result }}' },
            } as never,
          ],
        }),
        payload: {},
        maxTimeoutMs: 5000,
        getStepDefinition,
        logger,
      });

      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ greeting: 'hello' });
    });

    it('passes event payload into template context', async () => {
      const result = await executeWorkflowSync({
        workflowDefinition: makeWorkflow({
          steps: [
            { name: 'emit', type: 'workflow.output', with: { name: '{{ event.user }}' } } as never,
          ],
        }),
        payload: { user: 'alice' },
        maxTimeoutMs: 5000,
        getStepDefinition,
        logger,
      });

      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ name: 'alice' });
    });

    it('skips steps whose if condition is falsy', async () => {
      const result = await executeWorkflowSync({
        workflowDefinition: makeWorkflow({
          steps: [
            {
              name: 'conditional',
              type: 'test.echo',
              if: 'event.runMe',
              with: { value: 'ran' },
            } as never,
            {
              name: 'emit',
              type: 'workflow.output',
              with: { ran: '${{ steps.conditional.output.result }}' },
            } as never,
          ],
        }),
        payload: { runMe: false },
        maxTimeoutMs: 5000,
        getStepDefinition,
        logger,
      });

      expect(result.status).toBe('completed');
      // conditional was skipped — steps.conditional is undefined in context
      expect(result.output).toEqual({ ran: undefined });
    });

    it('returns failed status when a step throws', async () => {
      const result = await executeWorkflowSync({
        workflowDefinition: makeWorkflow({
          steps: [{ name: 'boom', type: 'test.fail' } as never],
        }),
        payload: {},
        maxTimeoutMs: 5000,
        getStepDefinition,
        logger,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toMatch('step error');
    });

    it('returns failed status when step type is not registered', async () => {
      const result = await executeWorkflowSync({
        workflowDefinition: makeWorkflow({
          steps: [{ name: 's', type: 'unknown.step' } as never],
        }),
        payload: {},
        maxTimeoutMs: 5000,
        getStepDefinition,
        logger,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toMatch('No step definition found for type "unknown.step"');
    });

    it('times out when execution exceeds maxTimeoutMs', async () => {
      const slowStep: ServerStepDefinition = {
        id: 'test.slow',
        label: 'test',
        description: 'test',
        category: 'test' as never,
        inputSchema: {} as never,
        outputSchema: {} as never,
        handler: () => new Promise((resolve) => setTimeout(() => resolve({ output: {} }), 500)),
      };

      const result = await executeWorkflowSync({
        workflowDefinition: makeWorkflow({
          steps: [{ name: 'slow', type: 'test.slow' } as never],
        }),
        payload: {},
        maxTimeoutMs: 50,
        getStepDefinition: (t) => (t === 'test.slow' ? slowStep : undefined),
        logger,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toMatch('timed out');
    });
  });

  describe('call_site.proceed suspend/resume', () => {
    it('returns suspended status with checkpoint when call_site.proceed is encountered', async () => {
      const result = await executeWorkflowSync({
        workflowDefinition: makeWorkflow({
          steps: [
            { name: 'pre', type: 'test.echo', with: { value: 'before' } } as never,
            { name: 'proceed', type: 'call_site.proceed', with: { messages: [] } } as never,
            { name: 'post', type: 'test.echo', with: { value: 'after' } } as never,
          ],
        }),
        payload: { sessionId: 'test' },
        maxTimeoutMs: 5000,
        getStepDefinition,
        logger,
      });

      expect(result.status).toBe('suspended');
      expect(result.checkpoint).toBeDefined();
      const checkpoint = result.checkpoint as WorkflowCheckpoint;
      expect(checkpoint.stepName).toBe('proceed');
      expect(checkpoint.stepIndex).toBe(2);
      expect((checkpoint.context as Record<string, unknown>).steps).toMatchObject({
        pre: { output: { result: 'before' } },
      });
    });

    it('resumes at stepIndex and writes proceedResult into steps context', async () => {
      const firstRun = await executeWorkflowSync({
        workflowDefinition: makeWorkflow({
          steps: [
            { name: 'pre', type: 'test.echo', with: { value: 'before' } } as never,
            { name: 'proceed', type: 'call_site.proceed', with: { messages: [] } } as never,
            {
              name: 'post',
              type: 'workflow.output',
              with: { response: '{{ steps.proceed.output.response }}' },
            } as never,
          ],
        }),
        payload: { sessionId: 'test' },
        maxTimeoutMs: 5000,
        getStepDefinition,
        logger,
      });

      expect(firstRun.status).toBe('suspended');
      const checkpoint = firstRun.checkpoint as WorkflowCheckpoint;

      const resumed = await executeWorkflowSync({
        workflowDefinition: makeWorkflow({
          steps: [
            { name: 'pre', type: 'test.echo', with: { value: 'before' } } as never,
            { name: 'proceed', type: 'call_site.proceed', with: { messages: [] } } as never,
            {
              name: 'post',
              type: 'workflow.output',
              with: { response: '{{ steps.proceed.output.response }}' },
            } as never,
          ],
        }),
        payload: { sessionId: 'test' },
        maxTimeoutMs: 5000,
        getStepDefinition,
        logger,
        resumeFrom: checkpoint,
        proceedResult: { response: 'llm response text' },
      });

      expect(resumed.status).toBe('completed');
      expect(resumed.output).toEqual({ response: 'llm response text' });
    });

    it('returns completed without suspension when no call_site.proceed step is present', async () => {
      const result = await executeWorkflowSync({
        workflowDefinition: makeWorkflow({
          steps: [
            { name: 'step', type: 'test.echo', with: { value: 'no-proceed' } } as never,
            {
              name: 'out',
              type: 'workflow.output',
              with: { val: '{{ steps.step.output.result }}' },
            } as never,
          ],
        }),
        payload: {},
        maxTimeoutMs: 5000,
        getStepDefinition,
        logger,
      });

      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ val: 'no-proceed' });
    });
  });
});
