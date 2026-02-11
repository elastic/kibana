/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import type { ConnectorInstance, ConnectorTypeInfo } from '@kbn/workflows';
import type { LineColumnPosition } from '../../../../../../entities/workflows/store';
import {
  getActionTypeDisplayNameFromStepType,
  getActionTypeIdFromStepType,
} from '../../../../../../shared/lib/action_type_utils';
import {
  getConnectorTypesFromStepType,
  getCustomStepConnectorIdSelectionHandler,
  getInferenceConnectorTaskTypeFromSubAction,
  isCreateConnectorEnabledForStepType,
} from '../../../../../../shared/lib/connectors_utils';

/**
 * Generate connector-id suggestions for a specific connector type
 */
export function getConnectorIdSuggestionsItems(
  stepType: string,
  range: monaco.IRange | monaco.languages.CompletionItemRanges,
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  const instances = getConnectorInstancesForType(stepType, dynamicConnectorTypes);

  instances.forEach((instance) =>
    suggestions.push(createConnectorSuggestion(instance, stepType, range))
  );

  if (isCreateConnectorEnabledForStepType(stepType)) {
    const connectorType = getConnectorTypesFromStepType(stepType)[0];
    suggestions.push(createConnectorCreationSuggestion(connectorType, range));
  }
  return suggestions;
}

/**
 * Get connector instances for a list of connector types
 */
export function getConnectorInstancesForType(
  stepType: string,
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): Array<ConnectorInstance & { connectorType: string }> {
  if (!dynamicConnectorTypes) {
    return [];
  }
  const customStepSelectionHandler = getCustomStepConnectorIdSelectionHandler(stepType);
  const connectorTypes = customStepSelectionHandler?.connectorTypes ?? [stepType];

  return connectorTypes.flatMap((connectorType) => {
    // Remove the leading dot just in case. e.g. .inference.completion -> inference.completion
    const cleanStepType = connectorType.startsWith('.') ? connectorType.slice(1) : connectorType;
    // Split base connector type and sub action e.g. inference.completion -> inference, completion
    const [baseConnectorType, subAction] = cleanStepType.split('.');
    // Use the exact action type ID to lookup the connector e.g. ['.inference']
    const actionTypeId = getActionTypeIdFromStepType(baseConnectorType);
    const connectorTypeInfo = dynamicConnectorTypes[actionTypeId];

    if (connectorTypeInfo?.instances?.length > 0) {
      let instances = connectorTypeInfo.instances;
      // Apply extra filtering for inference connectors based on the sub action
      if (baseConnectorType === 'inference' && subAction) {
        const taskType = getInferenceConnectorTaskTypeFromSubAction(subAction);
        if (taskType) {
          instances = instances.filter(({ config }) => config?.taskType === taskType);
        }
      }

      // Return the connector instances for the specific action type ID
      return instances.map((instance) => ({
        ...instance,
        connectorType: connectorTypeInfo.actionTypeId,
      }));
    }

    return [];
  });
}

/**
 * Get a connector instance suggestion object
 */
function createConnectorSuggestion(
  instance: ConnectorInstance,
  stepType: string,
  range: monaco.IRange | monaco.languages.CompletionItemRanges
): monaco.languages.CompletionItem {
  let connectorName = instance.name;

  // Add status indicators to connector name
  if (instance.isDeprecated) {
    connectorName += ' (deprecated)';
  }
  if (instance.isPreconfigured) {
    connectorName += ' (preconfigured)';
  }
  // Create a label that shows both ID and name for better visibility
  const displayLabel = `${connectorName} • ${instance.id}`;

  return {
    label: displayLabel, // Show both connector ID and name
    kind: monaco.languages.CompletionItemKind.Value, // Use generic value kind
    insertText: instance.id, // Insert UUID
    range,
    detail: stepType, // Show connector type as detail - this is what CSS targets
    documentation: `Connector ID: ${instance.id}\nName: ${
      instance.name
    }\nType: ${stepType}\nStatus: ${instance.isDeprecated ? 'Deprecated' : 'Active'}${
      instance.isPreconfigured ? ', Preconfigured' : ''
    }`,
    sortText: `${instance.isDeprecated ? 'z' : 'a'}_${instance.name}`, // Sort deprecated items last
    preselect: !instance.isDeprecated, // Don't preselect deprecated connectors
    filterText: `${instance.id} ${connectorName} "${connectorName}" '${connectorName}' ${stepType}`, // Enhanced filter text for better targeting
  };
}

/**
 * Get a connector creation suggestion object
 */
function createConnectorCreationSuggestion(
  stepType: string,
  range: monaco.IRange | monaco.languages.CompletionItemRanges
): monaco.languages.CompletionItem {
  const actionTypeName = getActionTypeDisplayNameFromStepType(stepType);
  // Use provided insertPosition or calculate from range
  const insertPosition: LineColumnPosition =
    'startLineNumber' in range
      ? { lineNumber: range.startLineNumber, column: range.startColumn }
      : { lineNumber: range.replace.startLineNumber, column: range.replace.startColumn };

  const zeroWidthRange: monaco.IRange = {
    startLineNumber: insertPosition.lineNumber,
    endLineNumber: insertPosition.lineNumber,
    startColumn: insertPosition.column,
    endColumn: insertPosition.column,
  };

  return {
    label: i18n.translate('workflows.editor.autocomplete.createConnectorLabel', {
      defaultMessage: 'Create a new connector',
    }),
    kind: monaco.languages.CompletionItemKind.Text,
    insertText: '',
    range: zeroWidthRange,
    detail: actionTypeName,
    documentation: `Create a new connector of type ${actionTypeName}`,
    sortText: 'z_create',
    command: {
      id: 'workflows.editor.action.createConnector',
      title: 'Create connector',
      arguments: [{ connectorType: getActionTypeIdFromStepType(stepType), insertPosition }],
    },
  };
}
