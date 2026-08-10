/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorTypeInfo } from '@kbn/workflows';

export interface ConnectorActionCapabilities {
  connectorStepTypes: Set<string>;
  selectedConnectorStepTypes: Set<string>;
  supportedStepTypes: Set<string>;
  connectorName: string;
}

export function getActionTypeIdFromStepType(stepType: string): string {
  const cleanStepType = stepType.startsWith('.') ? stepType.slice(1) : stepType;
  const [actionType] = cleanStepType.split('.');
  return `.${actionType}`;
}

export function getActionTypeDisplayNameFromStepType(stepType: string): string {
  const actionType = getActionTypeIdFromStepType(stepType).slice(1); // Remove the leading dot
  return actionType.charAt(0).toUpperCase() + actionType.slice(1);
}

export function getConnectorActionCapabilities(
  connectorId: string,
  connectorTypes: Record<string, ConnectorTypeInfo>
): ConnectorActionCapabilities | undefined {
  const connectorTypeValues = Object.values(connectorTypes);
  const connectorStepTypes = new Set(
    connectorTypeValues.flatMap(({ actionTypeId, subActions }) => {
      const stepTypePrefix = actionTypeId.replace(/^\./, '');
      return subActions.map(({ name }) => `${stepTypePrefix}.${name}`);
    })
  );

  for (const { actionTypeId, instances, subActions } of connectorTypeValues) {
    const stepTypePrefix = actionTypeId.replace(/^\./, '');
    const instance = instances.find(({ id }) => id === connectorId);
    if (instance?.supportedSubActions !== undefined) {
      return {
        connectorStepTypes,
        selectedConnectorStepTypes: new Set(
          subActions.map(({ name }) => `${stepTypePrefix}.${name}`)
        ),
        supportedStepTypes: new Set(
          instance.supportedSubActions.map((subAction) => `${stepTypePrefix}.${subAction}`)
        ),
        connectorName: instance.name,
      };
    }
  }

  return undefined;
}

export function isConnectorActionUnavailable(
  connectorId: string,
  stepType: string,
  connectorTypes: Record<string, ConnectorTypeInfo>
): boolean {
  const capabilities = getConnectorActionCapabilities(connectorId, connectorTypes);
  return (
    capabilities?.selectedConnectorStepTypes.has(stepType) === true &&
    !capabilities.supportedStepTypes.has(stepType)
  );
}
