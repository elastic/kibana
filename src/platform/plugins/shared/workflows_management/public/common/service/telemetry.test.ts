/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { WorkflowsBaseTelemetry } from './telemetry';
import type { YamlValidationResult } from '../../features/validate_workflow_yaml/model/types';
import {
  workflowEventNames,
  WorkflowExecutionEventTypes,
  WorkflowImportExportEventTypes,
  WorkflowLifecycleEventTypes,
  WorkflowUIEventTypes,
  WorkflowValidationEventTypes,
} from '../lib/telemetry/events/workflows';
import type { TelemetryServiceClient } from '../lib/telemetry/types';

jest.mock('../lib/telemetry/utils/extract_workflow_metadata', () => {
  const actual = jest.requireActual('../lib/telemetry/utils/extract_workflow_metadata');
  return {
    ...actual,
    extractWorkflowMetadata: jest.fn(actual.extractWorkflowMetadata),
    extractStepInfoFromWorkflowYaml: jest.fn(actual.extractStepInfoFromWorkflowYaml),
  };
});

import {
  extractStepInfoFromWorkflowYaml,
  extractWorkflowMetadata,
} from '../lib/telemetry/utils/extract_workflow_metadata';

const extractWorkflowMetadataMock = jest.mocked(extractWorkflowMetadata);
const extractStepInfoFromWorkflowYamlMock = jest.mocked(extractStepInfoFromWorkflowYaml);

const createMockTelemetryClient = (): TelemetryServiceClient => ({
  reportEvent: jest.fn(),
});

const createMockValidationResult = (
  overrides: Partial<YamlValidationResult> = {}
): YamlValidationResult =>
  ({
    id: 'test-id',
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 10,
    hoverMessage: null,
    severity: 'error',
    message: 'Test error',
    owner: 'yaml',
    ...overrides,
  } as YamlValidationResult);

describe('WorkflowsBaseTelemetry', () => {
  let mockClient: TelemetryServiceClient;
  let telemetry: WorkflowsBaseTelemetry;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockTelemetryClient();
    telemetry = new WorkflowsBaseTelemetry(mockClient);
  });

  describe('getBaseResultParams', () => {
    it('returns success result when no error is provided', () => {
      telemetry.reportWorkflowDeleted({
        workflowIds: ['wf-1'],
        isBulkDelete: false,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowDeleted,
        expect.objectContaining({
          result: 'success',
        })
      );
      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowDeleted,
        expect.not.objectContaining({
          errorMessage: expect.anything(),
        })
      );
    });

    it('returns failed result with errorMessage when error is provided', () => {
      const error = new Error('Something went wrong');
      telemetry.reportWorkflowDeleted({
        workflowIds: ['wf-1'],
        isBulkDelete: false,
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowDeleted,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Something went wrong',
        })
      );
    });
  });

  describe('reportWorkflowCreated', () => {
    it('reports a successful workflow creation without workflowDefinition', () => {
      telemetry.reportWorkflowCreated({
        workflowId: 'wf-1',
      });

      expect(extractWorkflowMetadataMock).toHaveBeenCalledWith(undefined);
      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowCreated,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowCreated],
          workflowId: 'wf-1',
          result: 'success',
          enabled: false,
          stepCount: 0,
          connectorTypes: [],
          stepTypes: [],
          stepTypeCounts: {},
          triggerTypes: [],
          settingsUsed: [],
          hasDescription: false,
          tagCount: 0,
          constCount: 0,
        })
      );
    });

    it('reports a workflow creation with workflowDefinition and extracts metadata', () => {
      const workflowDefinition: Partial<WorkflowYaml> = {
        enabled: true,
        description: 'A test workflow',
        steps: [
          { name: 'step-1', type: 'foreach', steps: [] },
          { name: 'step-2', type: 'if', condition: 'true', steps: [] },
        ],
        triggers: [{ type: 'scheduled', with: { every: '1m' } }],
        settings: {
          concurrency: { max: 5, strategy: 'drop' },
        },
      };

      telemetry.reportWorkflowCreated({
        workflowId: 'wf-2',
        workflowDefinition,
        editorType: 'yaml',
        origin: 'workflow_detail',
      });

      expect(extractWorkflowMetadataMock).toHaveBeenCalledWith(workflowDefinition);
      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowCreated,
        expect.objectContaining({
          workflowId: 'wf-2',
          editorType: 'yaml',
          origin: 'workflow_detail',
          result: 'success',
          enabled: true,
          stepCount: 2,
          hasDescription: true,
        })
      );
    });

    it('reports a failed workflow creation with error', () => {
      const error = new Error('Creation failed');
      telemetry.reportWorkflowCreated({
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowCreated,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Creation failed',
        })
      );
    });

    it('does not include optional fields when not provided', () => {
      telemetry.reportWorkflowCreated({});

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('editorType');
      expect(eventData).not.toHaveProperty('origin');
      expect(eventData).not.toHaveProperty('concurrencyMax');
      expect(eventData).not.toHaveProperty('concurrencyStrategy');
    });

    it('includes concurrency fields when present in metadata', () => {
      extractWorkflowMetadataMock.mockReturnValueOnce({
        enabled: false,
        stepCount: 0,
        connectorTypes: [],
        stepTypes: [],
        stepTypeCounts: {},
        triggerTypes: [],
        inputCount: 0,
        constCount: 0,
        triggerCount: 0,
        hasTriggerConditions: false,
        settingsUsed: ['concurrency'],
        hasDescription: false,
        tagCount: 0,
        concurrencyMax: 10,
        concurrencyStrategy: 'drop',
      });

      telemetry.reportWorkflowCreated({
        workflowId: 'wf-3',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowCreated,
        expect.objectContaining({
          concurrencyMax: 10,
          concurrencyStrategy: 'drop',
        })
      );
    });
  });

  describe('reportWorkflowUpdated', () => {
    it('reports a general workflow update when enabled did not change', () => {
      telemetry.reportWorkflowUpdated({
        workflowId: 'wf-1',
        workflowUpdate: { yaml: 'updated yaml', name: 'New name' },
        hasValidationErrors: false,
        validationErrorCount: 0,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowUpdated,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowUpdated],
          workflowId: 'wf-1',
          hasValidationErrors: false,
          validationErrorCount: 0,
          editorType: 'yaml',
          result: 'success',
          updatedFields: ['yaml', 'name'],
        })
      );
    });

    it('reports WorkflowEnabledStateChanged when enabled is directly changed', () => {
      telemetry.reportWorkflowUpdated({
        workflowId: 'wf-1',
        workflowUpdate: { enabled: true },
        hasValidationErrors: false,
        validationErrorCount: 0,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged],
          workflowId: 'wf-1',
          enabled: true,
          isBulkAction: false,
          result: 'success',
        })
      );
      // Should NOT have reported WorkflowUpdated
      expect(mockClient.reportEvent).not.toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowUpdated,
        expect.anything()
      );
    });

    it('reports WorkflowEnabledStateChanged when enabled changes via YAML update', () => {
      telemetry.reportWorkflowUpdated({
        workflowId: 'wf-1',
        workflowUpdate: { yaml: 'updated yaml' },
        workflowDefinition: { enabled: true } satisfies Partial<WorkflowYaml>,
        originalWorkflow: { enabled: false } satisfies Partial<WorkflowYaml>,
        hasValidationErrors: false,
        validationErrorCount: 0,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged,
        expect.objectContaining({
          workflowId: 'wf-1',
          enabled: true,
          editorType: 'yaml',
        })
      );
    });

    it('does not report WorkflowEnabledStateChanged when enabled value is the same via YAML', () => {
      telemetry.reportWorkflowUpdated({
        workflowId: 'wf-1',
        workflowUpdate: { yaml: 'updated yaml' },
        workflowDefinition: { enabled: true } satisfies Partial<WorkflowYaml>,
        originalWorkflow: { enabled: true } satisfies Partial<WorkflowYaml>,
        hasValidationErrors: false,
        validationErrorCount: 0,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowUpdated,
        expect.anything()
      );
    });

    it('includes validationErrorTypes when provided', () => {
      telemetry.reportWorkflowUpdated({
        workflowId: 'wf-1',
        workflowUpdate: { name: 'test' },
        hasValidationErrors: true,
        validationErrorCount: 2,
        validationErrorTypes: ['schema', 'step-name-validation'],
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowUpdated,
        expect.objectContaining({
          validationErrorTypes: ['schema', 'step-name-validation'],
        })
      );
    });

    it('reports a failed update with error', () => {
      const error = new Error('Update failed');
      telemetry.reportWorkflowUpdated({
        workflowId: 'wf-1',
        workflowUpdate: { name: 'test' },
        hasValidationErrors: false,
        validationErrorCount: 0,
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowUpdated,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Update failed',
        })
      );
    });

    it('includes bulkActionCount for bulk enabled state changes', () => {
      telemetry.reportWorkflowUpdated({
        workflowId: 'wf-1',
        workflowUpdate: { enabled: false },
        hasValidationErrors: false,
        validationErrorCount: 0,
        isBulkAction: true,
        bulkActionCount: 5,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged,
        expect.objectContaining({
          isBulkAction: true,
          bulkActionCount: 5,
        })
      );
    });

    it('determines editorType as yaml when yaml is in the update', () => {
      telemetry.reportWorkflowUpdated({
        workflowId: 'wf-1',
        workflowUpdate: { yaml: 'some yaml' },
        hasValidationErrors: false,
        validationErrorCount: 0,
        editorType: 'visual',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowUpdated,
        expect.objectContaining({
          editorType: 'yaml',
        })
      );
    });

    it('defaults editorType to ui when origin is workflow_detail and no yaml in update', () => {
      telemetry.reportWorkflowUpdated({
        workflowId: 'wf-1',
        workflowUpdate: { name: 'new-name' },
        hasValidationErrors: false,
        validationErrorCount: 0,
        origin: 'workflow_detail',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowUpdated,
        expect.objectContaining({
          editorType: 'ui',
          origin: 'workflow_detail',
        })
      );
    });

    it('uses provided editorType when no yaml in update and origin is not workflow_detail', () => {
      telemetry.reportWorkflowUpdated({
        workflowId: 'wf-1',
        workflowUpdate: { name: 'new-name' },
        hasValidationErrors: false,
        validationErrorCount: 0,
        editorType: 'visual',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowUpdated,
        expect.objectContaining({
          editorType: 'visual',
        })
      );
    });
  });

  describe('reportWorkflowDeleted', () => {
    it('reports a successful single deletion', () => {
      telemetry.reportWorkflowDeleted({
        workflowIds: ['wf-1'],
        isBulkDelete: false,
        origin: 'workflow_detail',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowDeleted,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowDeleted],
          workflowIds: ['wf-1'],
          isBulkDelete: false,
          origin: 'workflow_detail',
          result: 'success',
        })
      );
    });

    it('reports a bulk deletion', () => {
      telemetry.reportWorkflowDeleted({
        workflowIds: ['wf-1', 'wf-2', 'wf-3'],
        isBulkDelete: true,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowDeleted,
        expect.objectContaining({
          workflowIds: ['wf-1', 'wf-2', 'wf-3'],
          isBulkDelete: true,
          result: 'success',
        })
      );
    });

    it('reports a failed deletion with error', () => {
      const error = new Error('Delete failed');
      telemetry.reportWorkflowDeleted({
        workflowIds: ['wf-1'],
        isBulkDelete: false,
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowDeleted,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Delete failed',
        })
      );
    });

    it('does not include origin when not provided', () => {
      telemetry.reportWorkflowDeleted({
        workflowIds: ['wf-1'],
        isBulkDelete: false,
      });

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('origin');
    });
  });

  describe('reportWorkflowEnabledStateChanged', () => {
    it('reports enabling a workflow', () => {
      telemetry.reportWorkflowEnabledStateChanged({
        workflowId: 'wf-1',
        enabled: true,
        isBulkAction: false,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged],
          workflowId: 'wf-1',
          enabled: true,
          isBulkAction: false,
          result: 'success',
        })
      );
    });

    it('reports disabling a workflow', () => {
      telemetry.reportWorkflowEnabledStateChanged({
        workflowId: 'wf-1',
        enabled: false,
        isBulkAction: false,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged,
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('reports bulk action with count', () => {
      telemetry.reportWorkflowEnabledStateChanged({
        workflowId: 'wf-1',
        enabled: true,
        isBulkAction: true,
        bulkActionCount: 10,
        origin: 'workflow_list',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged,
        expect.objectContaining({
          isBulkAction: true,
          bulkActionCount: 10,
          origin: 'workflow_list',
        })
      );
    });

    it('reports a failed state change with error', () => {
      const error = new Error('Toggle failed');
      telemetry.reportWorkflowEnabledStateChanged({
        workflowId: 'wf-1',
        enabled: true,
        isBulkAction: false,
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Toggle failed',
        })
      );
    });

    it('includes editorType when provided', () => {
      telemetry.reportWorkflowEnabledStateChanged({
        workflowId: 'wf-1',
        enabled: true,
        isBulkAction: false,
        editorType: 'yaml',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged,
        expect.objectContaining({
          editorType: 'yaml',
        })
      );
    });
  });

  describe('reportWorkflowCloned', () => {
    it('reports a successful clone', () => {
      telemetry.reportWorkflowCloned({
        sourceWorkflowId: 'wf-source',
        newWorkflowId: 'wf-clone',
        editorType: 'visual',
        origin: 'workflow_detail',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowCloned,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowCloned],
          sourceWorkflowId: 'wf-source',
          newWorkflowId: 'wf-clone',
          editorType: 'visual',
          origin: 'workflow_detail',
          result: 'success',
        })
      );
    });

    it('reports a failed clone without newWorkflowId', () => {
      const error = new Error('Clone failed');
      telemetry.reportWorkflowCloned({
        sourceWorkflowId: 'wf-source',
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowLifecycleEventTypes.WorkflowCloned,
        expect.objectContaining({
          sourceWorkflowId: 'wf-source',
          result: 'failed',
          errorMessage: 'Clone failed',
        })
      );

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('newWorkflowId');
    });
  });

  describe('reportWorkflowRunInitiated', () => {
    it('reports a successful run initiation', () => {
      telemetry.reportWorkflowRunInitiated({
        workflowId: 'wf-1',
        hasInputs: true,
        inputCount: 3,
        editorType: 'yaml',
        origin: 'workflow_detail',
        triggerTab: 'manual',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowRunInitiated,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowRunInitiated],
          workflowId: 'wf-1',
          hasInputs: true,
          inputCount: 3,
          editorType: 'yaml',
          origin: 'workflow_detail',
          triggerTab: 'manual',
          result: 'success',
        })
      );
    });

    it('reports a failed run initiation', () => {
      const error = new Error('Run failed');
      telemetry.reportWorkflowRunInitiated({
        workflowId: 'wf-1',
        hasInputs: false,
        inputCount: 0,
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowRunInitiated,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Run failed',
        })
      );
    });

    it('does not include optional fields when not provided', () => {
      telemetry.reportWorkflowRunInitiated({
        workflowId: 'wf-1',
        hasInputs: false,
        inputCount: 0,
      });

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('editorType');
      expect(eventData).not.toHaveProperty('origin');
      expect(eventData).not.toHaveProperty('triggerTab');
    });
  });

  describe('reportWorkflowRunCancelled', () => {
    it('reports a successful cancellation', () => {
      telemetry.reportWorkflowRunCancelled({
        workflowExecutionId: 'exec-1',
        workflowId: 'wf-1',
        timeToCancellation: 5000,
        origin: 'workflow_detail',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowRunCancelled,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowRunCancelled],
          workflowExecutionId: 'exec-1',
          workflowId: 'wf-1',
          timeToCancellation: 5000,
          origin: 'workflow_detail',
          result: 'success',
        })
      );
    });

    it('reports a failed cancellation', () => {
      const error = new Error('Cancel failed');
      telemetry.reportWorkflowRunCancelled({
        workflowExecutionId: 'exec-1',
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowRunCancelled,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Cancel failed',
        })
      );
    });

    it('does not include optional fields when not provided', () => {
      telemetry.reportWorkflowRunCancelled({
        workflowExecutionId: 'exec-1',
      });

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('workflowId');
      expect(eventData).not.toHaveProperty('timeToCancellation');
      expect(eventData).not.toHaveProperty('origin');
    });
  });

  describe('reportWorkflowExecutionsCancelled', () => {
    it('reports a successful bulk cancellation', () => {
      telemetry.reportWorkflowExecutionsCancelled({
        workflowId: 'wf-1',
        origin: 'workflow_detail',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowExecutionsCancelled,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowExecutionsCancelled],
          workflowId: 'wf-1',
          origin: 'workflow_detail',
          result: 'success',
        })
      );
    });

    it('reports a failed bulk cancellation', () => {
      const error = new Error('Bulk cancel failed');
      telemetry.reportWorkflowExecutionsCancelled({
        workflowId: 'wf-1',
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowExecutionsCancelled,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Bulk cancel failed',
        })
      );
    });

    it('does not include origin when not provided', () => {
      telemetry.reportWorkflowExecutionsCancelled({
        workflowId: 'wf-1',
      });

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('origin');
    });
  });

  describe('reportWorkflowTestRunInitiated', () => {
    it('reports a successful test run initiation', () => {
      telemetry.reportWorkflowTestRunInitiated({
        workflowId: 'wf-1',
        hasInputs: true,
        inputCount: 2,
        editorType: 'both',
        origin: 'workflow_detail',
        triggerTab: 'alert',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowTestRunInitiated,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowTestRunInitiated],
          workflowId: 'wf-1',
          hasInputs: true,
          inputCount: 2,
          editorType: 'both',
          origin: 'workflow_detail',
          triggerTab: 'alert',
          result: 'success',
        })
      );
    });

    it('reports a test run for a new workflow without workflowId', () => {
      telemetry.reportWorkflowTestRunInitiated({
        hasInputs: false,
        inputCount: 0,
      });

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('workflowId');
      expect(eventData).toHaveProperty('result', 'success');
    });

    it('reports a failed test run initiation', () => {
      const error = new Error('Test run failed');
      telemetry.reportWorkflowTestRunInitiated({
        workflowId: 'wf-1',
        hasInputs: false,
        inputCount: 0,
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowTestRunInitiated,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Test run failed',
        })
      );
    });
  });

  describe('reportWorkflowStepTestRunInitiated', () => {
    it('reports a step test run with YAML providing step info', () => {
      extractStepInfoFromWorkflowYamlMock.mockReturnValueOnce({
        stepType: 'slack.webhook',
        connectorType: 'slack.webhook',
        workflowId: 'wf-from-yaml',
      });

      telemetry.reportWorkflowStepTestRunInitiated({
        workflowYaml: 'some yaml',
        stepId: 'my-step',
        editorType: 'yaml',
        origin: 'workflow_detail',
      });

      expect(extractStepInfoFromWorkflowYamlMock).toHaveBeenCalledWith('some yaml', 'my-step');
      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowStepTestRunInitiated,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowStepTestRunInitiated],
          workflowId: 'wf-from-yaml',
          stepId: 'my-step',
          stepType: 'slack.webhook',
          connectorType: 'slack.webhook',
          editorType: 'yaml',
          origin: 'workflow_detail',
          result: 'success',
        })
      );
    });

    it('reports unknown stepType when workflowYaml is null', () => {
      telemetry.reportWorkflowStepTestRunInitiated({
        workflowYaml: null,
        stepId: 'my-step',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowStepTestRunInitiated,
        expect.objectContaining({
          stepId: 'my-step',
          stepType: 'unknown',
          result: 'success',
        })
      );
    });

    it('reports unknown stepType when extractStepInfoFromWorkflowYaml returns null', () => {
      extractStepInfoFromWorkflowYamlMock.mockReturnValueOnce(null);

      telemetry.reportWorkflowStepTestRunInitiated({
        workflowYaml: 'bad yaml',
        stepId: 'my-step',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowStepTestRunInitiated,
        expect.objectContaining({
          stepType: 'unknown',
        })
      );
    });

    it('reports a failed step test run', () => {
      extractStepInfoFromWorkflowYamlMock.mockReturnValueOnce({
        stepType: 'if',
        workflowId: 'wf-1',
      });
      const error = new Error('Step test failed');

      telemetry.reportWorkflowStepTestRunInitiated({
        workflowYaml: 'some yaml',
        stepId: 'my-step',
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowExecutionEventTypes.WorkflowStepTestRunInitiated,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Step test failed',
        })
      );
    });

    it('does not include connectorType when step is not a connector step', () => {
      extractStepInfoFromWorkflowYamlMock.mockReturnValueOnce({
        stepType: 'foreach',
        workflowId: 'wf-1',
      });

      telemetry.reportWorkflowStepTestRunInitiated({
        workflowYaml: 'some yaml',
        stepId: 'my-step',
      });

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('connectorType');
    });
  });

  describe('reportWorkflowExported', () => {
    it('reports a successful export', () => {
      telemetry.reportWorkflowExported({
        workflowCount: 3,
        format: 'zip',
        referenceResolution: 'add_all',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowExported,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowImportExportEventTypes.WorkflowExported],
          workflowCount: 3,
          format: 'zip',
          referenceResolution: 'add_all',
          result: 'success',
        })
      );
    });

    it('reports a single yaml export', () => {
      telemetry.reportWorkflowExported({
        workflowCount: 1,
        format: 'yaml',
        referenceResolution: 'none',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowExported,
        expect.objectContaining({
          workflowCount: 1,
          format: 'yaml',
          referenceResolution: 'none',
        })
      );
    });

    it('reports a failed export', () => {
      const error = new Error('Export failed');
      telemetry.reportWorkflowExported({
        workflowCount: 1,
        format: 'yaml',
        referenceResolution: 'none',
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowExported,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Export failed',
        })
      );
    });
  });

  describe('reportWorkflowImported', () => {
    it('reports a successful import', () => {
      telemetry.reportWorkflowImported({
        workflowCount: 5,
        format: 'zip',
        conflictResolution: 'generateNewIds',
        hasConflicts: true,
        successCount: 4,
        failedCount: 1,
        minStepCount: 2,
        maxStepCount: 15,
        minTriggerCount: 1,
        maxTriggerCount: 3,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowImported,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowImportExportEventTypes.WorkflowImported],
          workflowCount: 5,
          format: 'zip',
          conflictResolution: 'generateNewIds',
          hasConflicts: true,
          successCount: 4,
          failedCount: 1,
          minStepCount: 2,
          maxStepCount: 15,
          minTriggerCount: 1,
          maxTriggerCount: 3,
          result: 'success',
        })
      );
    });

    it('reports an import with overwrite conflict resolution', () => {
      telemetry.reportWorkflowImported({
        workflowCount: 1,
        format: 'yaml',
        conflictResolution: 'overwrite',
        hasConflicts: false,
        successCount: 1,
        failedCount: 0,
        minStepCount: 3,
        maxStepCount: 3,
        minTriggerCount: 1,
        maxTriggerCount: 1,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowImported,
        expect.objectContaining({
          conflictResolution: 'overwrite',
          hasConflicts: false,
        })
      );
    });

    it('reports a failed import', () => {
      const error = new Error('Import failed');
      telemetry.reportWorkflowImported({
        workflowCount: 1,
        format: 'yaml',
        conflictResolution: 'generateNewIds',
        hasConflicts: false,
        successCount: 0,
        failedCount: 1,
        minStepCount: 0,
        maxStepCount: 0,
        minTriggerCount: 0,
        maxTriggerCount: 0,
        error,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowImported,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Import failed',
        })
      );
    });
  });

  describe('reportWorkflowListViewed', () => {
    it('reports a list view without filters', () => {
      telemetry.reportWorkflowListViewed({
        workflowCount: 25,
        pageNumber: 1,
        search: {},
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowUIEventTypes.WorkflowListViewed,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowUIEventTypes.WorkflowListViewed],
          workflowCount: 25,
          pageNumber: 1,
        })
      );

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('filterTypes');
    });

    it('reports a list view with search query', () => {
      telemetry.reportWorkflowListViewed({
        workflowCount: 5,
        pageNumber: 1,
        search: { query: 'my-workflow' },
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowUIEventTypes.WorkflowListViewed,
        expect.objectContaining({
          filterTypes: ['query'],
        })
      );
    });

    it('reports a list view with array filters', () => {
      telemetry.reportWorkflowListViewed({
        workflowCount: 10,
        pageNumber: 2,
        search: { query: 'test', enabled: [true], createdBy: ['user1', 'user2'] },
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowUIEventTypes.WorkflowListViewed,
        expect.objectContaining({
          filterTypes: ['query', 'enabled', 'createdBy'],
        })
      );
    });

    it('ignores size and page keys in search', () => {
      telemetry.reportWorkflowListViewed({
        workflowCount: 10,
        pageNumber: 1,
        search: { size: 25, page: 1 },
      });

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('filterTypes');
    });

    it('ignores empty array filters', () => {
      telemetry.reportWorkflowListViewed({
        workflowCount: 10,
        pageNumber: 1,
        search: { enabled: [] },
      });

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('filterTypes');
    });
  });

  describe('reportWorkflowDetailViewed', () => {
    it('reports a detail view on workflow tab', () => {
      telemetry.reportWorkflowDetailViewed({
        workflowId: 'wf-1',
        tab: 'workflow',
        editorType: 'yaml',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowUIEventTypes.WorkflowDetailViewed,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowUIEventTypes.WorkflowDetailViewed],
          workflowId: 'wf-1',
          tab: 'workflow',
          editorType: 'yaml',
        })
      );
    });

    it('reports a detail view on executions tab without editorType', () => {
      telemetry.reportWorkflowDetailViewed({
        workflowId: 'wf-1',
        tab: 'executions',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowUIEventTypes.WorkflowDetailViewed,
        expect.objectContaining({
          workflowId: 'wf-1',
          tab: 'executions',
        })
      );

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('editorType');
    });
  });

  describe('reportWorkflowValidationError', () => {
    it('reports validation errors for a workflow', () => {
      const validationResults: YamlValidationResult[] = [
        createMockValidationResult({
          owner: 'yaml',
          message: 'Invalid field',
          startLineNumber: 1,
          startColumn: 1,
        }),
        createMockValidationResult({
          owner: 'step-name-validation',
          message: 'Duplicate step name',
          startLineNumber: 5,
          startColumn: 3,
        }),
      ];

      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-1',
        validationResults,
        editorType: 'yaml',
        origin: 'workflow_detail',
      });

      expect(mockClient.reportEvent).toHaveBeenCalledWith(
        WorkflowValidationEventTypes.WorkflowValidationError,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowValidationEventTypes.WorkflowValidationError],
          workflowId: 'wf-1',
          errorCount: 2,
          editorType: 'yaml',
          origin: 'workflow_detail',
        })
      );

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1] as unknown as Record<string, unknown>;
      expect(eventData.errorTypes).toEqual(
        expect.arrayContaining(['yaml', 'step-name-validation'])
      );
    });

    it('does not report when there are no error-severity results', () => {
      const validationResults: YamlValidationResult[] = [
        createMockValidationResult({
          severity: 'warning',
          owner: 'yaml',
          message: 'Some warning',
        }),
      ];

      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-1',
        validationResults,
      });

      expect(mockClient.reportEvent).not.toHaveBeenCalled();
    });

    it('deduplicates: same error reported twice for same workflow emits only once', () => {
      const validationResults: YamlValidationResult[] = [
        createMockValidationResult({
          owner: 'yaml',
          message: 'Invalid field',
          startLineNumber: 1,
          startColumn: 1,
        }),
      ];

      // First call - should report
      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-1',
        validationResults,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledTimes(1);

      // Second call with same errors - should NOT report again
      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-1',
        validationResults,
      });

      expect(mockClient.reportEvent).toHaveBeenCalledTimes(1);
    });

    it('reports again after a previously reported error is resolved and reappears', () => {
      const errorResult = createMockValidationResult({
        owner: 'yaml',
        message: 'Invalid field',
        startLineNumber: 1,
        startColumn: 1,
      });

      // First call - report the error
      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-1',
        validationResults: [errorResult],
      });
      expect(mockClient.reportEvent).toHaveBeenCalledTimes(1);

      // Second call - error is resolved (empty results)
      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-1',
        validationResults: [],
      });
      // No new report since no new errors
      expect(mockClient.reportEvent).toHaveBeenCalledTimes(1);

      // Third call - error reappears
      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-1',
        validationResults: [errorResult],
      });
      // Should report again because the tracked errors were cleared
      expect(mockClient.reportEvent).toHaveBeenCalledTimes(2);
    });

    it('reports new errors even when some old ones are still present', () => {
      const error1 = createMockValidationResult({
        owner: 'yaml',
        message: 'Error 1',
        startLineNumber: 1,
        startColumn: 1,
      });
      const error2 = createMockValidationResult({
        owner: 'step-name-validation',
        message: 'Error 2',
        startLineNumber: 5,
        startColumn: 3,
      });

      // First call with error1
      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-1',
        validationResults: [error1],
      });
      expect(mockClient.reportEvent).toHaveBeenCalledTimes(1);

      // Second call with error1 + error2 - only error2 is new
      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-1',
        validationResults: [error1, error2],
      });
      expect(mockClient.reportEvent).toHaveBeenCalledTimes(2);
      expect(mockClient.reportEvent).toHaveBeenLastCalledWith(
        WorkflowValidationEventTypes.WorkflowValidationError,
        expect.objectContaining({
          errorCount: 1,
          errorTypes: ['step-name-validation'],
        })
      );
    });

    it('tracks errors per workflow independently', () => {
      const validationResults: YamlValidationResult[] = [
        createMockValidationResult({
          owner: 'yaml',
          message: 'Error',
          startLineNumber: 1,
          startColumn: 1,
        }),
      ];

      // Report for wf-1
      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-1',
        validationResults,
      });
      expect(mockClient.reportEvent).toHaveBeenCalledTimes(1);

      // Same error for wf-2 - should still report (different workflow)
      telemetry.reportWorkflowValidationError({
        workflowId: 'wf-2',
        validationResults,
      });
      expect(mockClient.reportEvent).toHaveBeenCalledTimes(2);
    });

    it('handles undefined workflowId', () => {
      const validationResults: YamlValidationResult[] = [
        createMockValidationResult({
          owner: 'yaml',
          message: 'Error',
        }),
      ];

      telemetry.reportWorkflowValidationError({
        validationResults,
      });

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('workflowId');
    });

    it('does not include optional fields when not provided', () => {
      const validationResults: YamlValidationResult[] = [
        createMockValidationResult({
          owner: 'yaml',
          message: 'Error',
        }),
      ];

      telemetry.reportWorkflowValidationError({
        validationResults,
      });

      const call = jest.mocked(mockClient.reportEvent).mock.calls[0];
      const eventData = call[1];
      expect(eventData).not.toHaveProperty('editorType');
      expect(eventData).not.toHaveProperty('origin');
    });
  });
});
