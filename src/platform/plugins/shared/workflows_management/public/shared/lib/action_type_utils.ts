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

export type ConnectorActionClassification =
  | { status: 'notConnectorAction' }
  | { status: 'differentConnectorAction' }
  | { status: 'available' }
  | { status: 'unavailable'; connectorName: string };

type SelectedConnectorActionCapabilities = Omit<ConnectorActionCapabilities, 'connectorStepTypes'>;

export interface ConnectorActionCapabilitiesIndex {
  connectorStepTypes: Set<string>;
  byConnectorId: Map<string, SelectedConnectorActionCapabilities>;
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

export function buildConnectorActionCapabilitiesIndex(
  connectorTypes: Record<string, ConnectorTypeInfo>
): ConnectorActionCapabilitiesIndex {
  const connectorStepTypes = new Set<string>();
  const byConnectorId = new Map<string, SelectedConnectorActionCapabilities>();

  for (const { actionTypeId, instances, subActions } of Object.values(connectorTypes)) {
    const stepTypePrefix = actionTypeId.replace(/^\./, '');
    const selectedConnectorStepTypes = new Set(
      subActions.map(({ name }) => `${stepTypePrefix}.${name}`)
    );
    selectedConnectorStepTypes.forEach((stepType) => connectorStepTypes.add(stepType));

    for (const instance of instances) {
      if (instance.supportedSubActions !== undefined) {
        byConnectorId.set(instance.id, {
          connectorName: instance.name,
          selectedConnectorStepTypes,
          supportedStepTypes: new Set(
            instance.supportedSubActions.map((subAction) => `${stepTypePrefix}.${subAction}`)
          ),
        });
      }
    }
  }

  return { connectorStepTypes, byConnectorId };
}

const getConnectorActionCapabilities = (
  connectorId: string,
  index: ConnectorActionCapabilitiesIndex
): ConnectorActionCapabilities | undefined => {
  const selectedCapabilities = index.byConnectorId.get(connectorId);
  return selectedCapabilities
    ? {
        connectorStepTypes: index.connectorStepTypes,
        ...selectedCapabilities,
      }
    : undefined;
};

export function classifyConnectorAction(
  connectorId: string,
  stepType: string,
  index: ConnectorActionCapabilitiesIndex
): ConnectorActionClassification | undefined {
  const capabilities = getConnectorActionCapabilities(connectorId, index);
  if (!capabilities) {
    return undefined;
  }
  if (!capabilities.connectorStepTypes.has(stepType)) {
    return { status: 'notConnectorAction' };
  }
  if (!capabilities.selectedConnectorStepTypes.has(stepType)) {
    return { status: 'differentConnectorAction' };
  }
  if (capabilities.supportedStepTypes.has(stepType)) {
    return { status: 'available' };
  }
  return { status: 'unavailable', connectorName: capabilities.connectorName };
}
