/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import { i18n } from '@kbn/i18n';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { isTemplateReference } from './is_template_reference';
import {
  getValueFromValueNode,
  type StepInfo,
  type WorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { getActionTypeIdFromStepType } from '../../../shared/lib/action_type_utils';
import type { YamlValidationResult } from '../model/types';

const validateStep = (
  step: StepInfo,
  connectorTypes: Record<string, ConnectorTypeInfo>,
  lineCounter: LineCounter
): YamlValidationResult | undefined => {
  const connectorId = getValueFromValueNode(step.propInfos['connector-id']?.valueNode);
  if (typeof connectorId !== 'string' || isTemplateReference(connectorId)) {
    return undefined;
  }

  const connectorType = connectorTypes[getActionTypeIdFromStepType(step.stepType)];
  const instance = connectorType?.instances.find(({ id }) => id === connectorId);
  const subAction = step.stepType.replace(/^\./, '').split('.').slice(1).join('.');
  const typeRange = step.propInfos.type?.valueNode.range;

  if (
    !instance?.supportedSubActions ||
    !subAction ||
    instance.supportedSubActions.includes(subAction) ||
    !typeRange
  ) {
    return undefined;
  }

  const [startOffset, endOffset] = typeRange;
  const startPos = lineCounter.linePos(startOffset);
  const endPos = lineCounter.linePos(endOffset);
  return {
    id: `unsupported-connector-action-${step.stepId}-${startPos.line}-${startPos.col}`,
    owner: 'connector-capability-validation',
    severity: 'warning',
    message: i18n.translate(
      'workflows.validateUnavailableConnectorActions.unsupportedActionMessage',
      {
        defaultMessage:
          'Action "{action}" is not available for connector "{connectorName}" because of its authentication method.',
        values: { action: subAction, connectorName: instance.name },
      }
    ),
    hoverMessage: null,
    startLineNumber: startPos.line,
    startColumn: startPos.col,
    endLineNumber: endPos.line,
    endColumn: endPos.col,
  };
};

export function validateUnavailableConnectorActions(
  workflowLookup: WorkflowLookup,
  connectorTypes: Record<string, ConnectorTypeInfo>,
  lineCounter: LineCounter
): YamlValidationResult[] {
  return Object.values(workflowLookup.steps).flatMap((step) => {
    const result = validateStep(step, connectorTypes, lineCounter);
    return result ? [result] : [];
  });
}
