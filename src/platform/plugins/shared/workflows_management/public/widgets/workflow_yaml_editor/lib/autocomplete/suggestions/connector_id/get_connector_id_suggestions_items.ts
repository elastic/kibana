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
import { getActionTypeDisplayNameFromStepType } from '../../../../../../shared/lib/action_type_utils';
import {
  getActionTypeIdsFromStepType,
  getCustomStepConnectorIdSelectionHandler,
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
    const actionTypeId = getActionTypeIdsFromStepType(stepType)[0];
    suggestions.push(createConnectorCreationSuggestion(actionTypeId, range));
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
  const connectorTypeIds = customStepSelectionHandler?.actionTypeIds ?? [stepType];

  return connectorTypeIds.flatMap((connectorTypeId) => {
    // For sub-action connectors (e.g., "inference.completion"), get the base type
    const baseConnectorType = connectorTypeId.includes('.')
      ? connectorTypeId.split('.')[0]
      : connectorTypeId;

    // Try multiple lookup strategies to find the connector type
    const lookupCandidates = [
      connectorTypeId, // Direct match (e.g., "slack")
      `.${connectorTypeId}`, // With dot prefix (e.g., ".slack")
      baseConnectorType, // Base type for sub-actions (e.g., "inference" from "inference.completion")
      `.${baseConnectorType}`, // Base type with dot prefix (e.g., ".inference")
    ];

    for (const candidate of lookupCandidates) {
      const connectorTypeInfo = dynamicConnectorTypes[candidate];

      if (connectorTypeInfo?.instances?.length > 0) {
        return connectorTypeInfo.instances.map((instance) => ({
          ...instance,
          connectorType: connectorTypeInfo.actionTypeId,
        }));
      }
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
  actionTypeId: string,
  range: monaco.IRange | monaco.languages.CompletionItemRanges
): monaco.languages.CompletionItem {
  const actionTypeName = getActionTypeDisplayNameFromStepType(actionTypeId);
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
      arguments: [{ connectorType: actionTypeId, insertPosition }],
    },
    filterText: ' ',
  };
}
