/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import {
  useAvailableConnectors,
  useFetchConnector,
} from '../../../entities/connectors/model/use_available_connectors';
import { findStepConnectorId } from '../lib/find_step_connector_id';
import type { StepAiMetadata } from '../lib/normalize_step_ai';
import { normalizeStepAi } from '../lib/normalize_step_ai';

interface UseStepAiParams {
  workflowDefinition: WorkflowYaml | null;
  stepId: string;
  activeStepExecution: WorkflowStepExecutionDto | null | undefined;
}

interface StepAi {
  /** AI metadata for the step, with the connector's default model when the output has none. */
  stepAiWithModel: StepAiMetadata | undefined;
  aiConnectorName: string | undefined;
}

/** Collects the AI usage, model and connector name to show for a step. */
export const useStepAi = ({
  workflowDefinition,
  stepId,
  activeStepExecution,
}: UseStepAiParams): StepAi => {
  const definitionConnectorId = useMemo(
    () => findStepConnectorId(workflowDefinition, stepId),
    [workflowDefinition, stepId]
  );

  const stepAi = useMemo(
    () =>
      normalizeStepAi({
        usage: activeStepExecution?.usage,
        output: activeStepExecution?.output,
        connectorId: definitionConnectorId,
      }),
    [activeStepExecution?.usage, activeStepExecution?.output, definitionConnectorId]
  );

  const { data: fetchedConnector } = useFetchConnector(stepAi?.connectorId);
  const availableConnectors = useAvailableConnectors();
  const aiConnectorName = useMemo(() => {
    const id = stepAi?.connectorId;
    if (!id) return undefined;
    if (fetchedConnector?.name) return fetchedConnector.name;
    for (const typeInfo of Object.values(availableConnectors?.connectorTypes ?? {})) {
      const match = typeInfo.instances.find((inst) => inst.id === id);
      if (match?.name) return match.name;
    }
    return id;
  }, [availableConnectors?.connectorTypes, fetchedConnector?.name, stepAi?.connectorId]);

  // LangChain often omits model from response_metadata; fall back to connector defaultModel.
  const stepAiWithModel = useMemo(() => {
    if (!stepAi) return undefined;
    if (stepAi.model) return stepAi;
    const config =
      fetchedConnector && 'config' in fetchedConnector ? fetchedConnector.config : undefined;
    const defaultModel =
      typeof config?.defaultModel === 'string' && config.defaultModel.length > 0
        ? config.defaultModel
        : undefined;
    return defaultModel ? { ...stepAi, model: defaultModel } : stepAi;
  }, [fetchedConnector, stepAi]);

  return { stepAiWithModel, aiConnectorName };
};
