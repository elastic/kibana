/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { useStepAi } from './use_step_ai';

jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useAvailableConnectors: () => ({ connectorTypes: {} }),
  useFetchConnector: () => ({ data: undefined }),
}));

const buildDefinition = (stepName: string, type: string): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: [],
    steps: [{ name: stepName, type, 'connector-id': 'connector-1', with: {} }],
  } as unknown as WorkflowYaml);

const buildExecution = (
  stepId: string,
  stepType: string,
  extra: Partial<WorkflowStepExecutionDto> = {}
) => ({ stepId, stepType, ...extra } as unknown as WorkflowStepExecutionDto);

describe('useStepAi', () => {
  it('does not return AI metadata for a Slack step that only has a connector-id', () => {
    const { result } = renderHook(() =>
      useStepAi({
        workflowDefinition: buildDefinition('notify', 'slack'),
        stepId: 'notify',
        stepType: 'slack',
        activeStepExecution: buildExecution('notify', 'slack', { output: { ok: true } }),
      })
    );

    expect(result.current.stepAiWithModel).toBeUndefined();
  });

  it('still returns AI metadata for an AI step with a connector-id', () => {
    const { result } = renderHook(() =>
      useStepAi({
        workflowDefinition: buildDefinition('summarize', 'ai.prompt'),
        stepId: 'summarize',
        stepType: 'ai.prompt',
        activeStepExecution: buildExecution('summarize', 'ai.prompt'),
      })
    );

    expect(result.current.stepAiWithModel).toEqual(
      expect.objectContaining({ connectorId: 'connector-1' })
    );
  });
});
