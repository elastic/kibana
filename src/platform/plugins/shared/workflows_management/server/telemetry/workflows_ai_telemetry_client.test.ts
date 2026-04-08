/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { WORKFLOWS_AI_EDIT_RESULT_EVENT_TYPE } from './events/workflows_ai_edit_result';
import { WorkflowsAiTelemetryClient } from './workflows_ai_telemetry_client';

const createMockAnalytics = () => ({
  reportEvent: jest.fn(),
  optIn: jest.fn(),
  registerEventType: jest.fn(),
  registerContextProvider: jest.fn(),
  removeContextProvider: jest.fn(),
  registerShipper: jest.fn(),
  telemetryCounter$: {} as never,
});

describe('WorkflowsAiTelemetryClient', () => {
  let analytics: ReturnType<typeof createMockAnalytics>;
  let client: WorkflowsAiTelemetryClient;

  beforeEach(() => {
    analytics = createMockAnalytics();
    client = new WorkflowsAiTelemetryClient(analytics as never, loggerMock.create());
  });

  describe('reportEditResult', () => {
    it('reports a successful edit with passing validation', () => {
      client.reportEditResult({
        toolId: 'workflows.workflow_insert_step',
        editSuccess: true,
        isCreation: false,
        validation: { valid: true },
        conversationId: 'conv-1',
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        WORKFLOWS_AI_EDIT_RESULT_EVENT_TYPE,
        expect.objectContaining({
          tool_id: 'workflows.workflow_insert_step',
          edit_success: true,
          is_creation: false,
          validation_passed: true,
          conversation_id: 'conv-1',
        })
      );
    });

    it('reports validation failure with error count', () => {
      client.reportEditResult({
        toolId: 'workflows.workflow_modify_step',
        editSuccess: true,
        isCreation: false,
        validation: { valid: false, errors: ['error1', 'error2'] },
        conversationId: 'conv-1',
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        WORKFLOWS_AI_EDIT_RESULT_EVENT_TYPE,
        expect.objectContaining({
          validation_passed: false,
          validation_error_count: 2,
        })
      );
    });

    it('reports a failed edit', () => {
      client.reportEditResult({
        toolId: 'workflows.workflow_insert_step',
        editSuccess: false,
        isCreation: false,
        conversationId: 'conv-1',
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        WORKFLOWS_AI_EDIT_RESULT_EVENT_TYPE,
        expect.objectContaining({
          edit_success: false,
          is_creation: false,
        })
      );
    });

    it('does not include validation fields when editSuccess is false', () => {
      client.reportEditResult({
        toolId: 'workflows.workflow_insert_step',
        editSuccess: false,
        isCreation: false,
        conversationId: 'conv-1',
        validation: { valid: false, errors: ['some error'] },
      });

      const reported = analytics.reportEvent.mock.calls[0][1];
      expect(reported.validation_passed).toBeUndefined();
      expect(reported.validation_error_count).toBeUndefined();
    });

    it('reports creation flag correctly', () => {
      client.reportEditResult({
        toolId: 'workflows.workflow_replace_yaml',
        editSuccess: true,
        isCreation: true,
        validation: { valid: true },
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        WORKFLOWS_AI_EDIT_RESULT_EVENT_TYPE,
        expect.objectContaining({
          is_creation: true,
        })
      );
    });
  });

  describe('self-correction tracking', () => {
    it('detects self-correction after validation failure then success', () => {
      client.reportEditResult({
        toolId: 'workflows.workflow_insert_step',
        editSuccess: true,
        isCreation: false,
        validation: { valid: false, errors: ['error1'] },
        conversationId: 'conv-1',
      });

      client.reportEditResult({
        toolId: 'workflows.workflow_modify_step',
        editSuccess: true,
        isCreation: false,
        validation: { valid: true },
        conversationId: 'conv-1',
      });

      expect(analytics.reportEvent).toHaveBeenCalledTimes(2);
      const secondCall = analytics.reportEvent.mock.calls[1][1];
      expect(secondCall.is_self_correction).toBe(true);
    });

    it('does not flag self-correction on first success', () => {
      client.reportEditResult({
        toolId: 'workflows.workflow_insert_step',
        editSuccess: true,
        isCreation: false,
        validation: { valid: true },
        conversationId: 'conv-1',
      });

      const call = analytics.reportEvent.mock.calls[0][1];
      expect(call.is_self_correction).toBeUndefined();
    });

    it('tracks per conversation independently', () => {
      client.reportEditResult({
        toolId: 'workflows.workflow_insert_step',
        editSuccess: true,
        isCreation: false,
        validation: { valid: false, errors: ['error1'] },
        conversationId: 'conv-1',
      });

      client.reportEditResult({
        toolId: 'workflows.workflow_insert_step',
        editSuccess: true,
        isCreation: false,
        validation: { valid: true },
        conversationId: 'conv-2',
      });

      const secondCall = analytics.reportEvent.mock.calls[1][1];
      expect(secondCall.is_self_correction).toBeUndefined();
    });

    it('does not track self-correction without conversationId', () => {
      client.reportEditResult({
        toolId: 'workflows.workflow_insert_step',
        editSuccess: true,
        isCreation: false,
        validation: { valid: false, errors: ['error1'] },
      });

      client.reportEditResult({
        toolId: 'workflows.workflow_insert_step',
        editSuccess: true,
        isCreation: false,
        validation: { valid: true },
      });

      const secondCall = analytics.reportEvent.mock.calls[1][1];
      expect(secondCall.is_self_correction).toBeUndefined();
    });

    it('evicts oldest entries when conversation count exceeds cap', () => {
      const cap = 1000;
      for (let i = 0; i < cap + 10; i++) {
        client.reportEditResult({
          toolId: 'workflows.workflow_insert_step',
          editSuccess: true,
          isCreation: false,
          validation: { valid: false, errors: ['err'] },
          conversationId: `conv-${i}`,
        });
      }

      client.reportEditResult({
        toolId: 'workflows.workflow_insert_step',
        editSuccess: true,
        isCreation: false,
        validation: { valid: true },
        conversationId: 'conv-0',
      });

      const lastCall = analytics.reportEvent.mock.calls.at(-1)?.[1];
      expect(lastCall.is_self_correction).toBeUndefined();
    });
  });
});
