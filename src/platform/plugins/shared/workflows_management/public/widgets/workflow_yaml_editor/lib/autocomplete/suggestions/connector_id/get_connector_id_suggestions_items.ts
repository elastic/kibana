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
import type { ConnectorTypeInfo } from '@kbn/workflows';
import type { LineColumnPosition } from '../../../../../../entities/workflows/store';
import { getActionTypeIdFromStepType } from '../../../../../../shared/lib/action_type_utils';

// We need to come up with a better way for suggestions due to custom steps support
// We use this workaround until that happens.
// Ideally, it should be managed on custom step level.
const aiSteps = ['ai.prompt', 'ai.summarize', 'ai.classify'];
const aiConnectors = ['gen-ai.run', 'inference.chatCompletion'];

/**
 * Generate connector-id suggestions for a specific connector type
 */

export function getConnectorIdSuggestionsItems(
  connectorType: string,
  range: monaco.IRange | monaco.languages.CompletionItemRanges,
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  const instances = getConnectorInstancesForType(connectorType, dynamicConnectorTypes);

  instances.forEach((instance) => {
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

    suggestions.push({
      label: displayLabel, // Show both connector ID and name
      kind: monaco.languages.CompletionItemKind.Value, // Use generic value kind
      insertText: instance.id, // Insert UUID
      range,
      detail: connectorType, // Show connector type as detail - this is what CSS targets
      documentation: `Connector ID: ${instance.id}\nName: ${
        instance.name
      }\nType: ${connectorType}\nStatus: ${instance.isDeprecated ? 'Deprecated' : 'Active'}${
        instance.isPreconfigured ? ', Preconfigured' : ''
      }`,
      sortText: `${instance.isDeprecated ? 'z' : 'a'}_${instance.name}`, // Sort deprecated items last
      preselect: !instance.isDeprecated, // Don't preselect deprecated connectors
      filterText: `${instance.id} ${connectorName} "${connectorName}" '${connectorName}' ${connectorType}`, // Enhanced filter text for better targeting
    });
  });

  // Use provided insertPosition or calculate from range
  const insertPosition: LineColumnPosition =
    'startLineNumber' in range
      ? { lineNumber: range.startLineNumber, column: range.startColumn }
      : { lineNumber: range.replace.startLineNumber, column: range.replace.startColumn };

  // Create a zero-width range at the insert position to prevent Monaco from replacing any text
  // when the empty insertText is applied. The command will handle the insertion after connector creation.
  const zeroWidthRange: monaco.IRange = {
    startLineNumber: insertPosition.lineNumber,
    endLineNumber: insertPosition.lineNumber,
    startColumn: insertPosition.column,
    endColumn: insertPosition.column,
  };

  suggestions.push({
    label: i18n.translate('workflows.editor.autocomplete.createConnectorLabel', {
      defaultMessage: 'Create a new connector',
    }),
    kind: monaco.languages.CompletionItemKind.Text,
    insertText: '',
    range: zeroWidthRange,
    detail: connectorType,
    documentation: `Create a new connector of type ${connectorType}`,
    sortText: 'z_create',
    command: {
      id: 'workflows.editor.action.createConnector',
      title: 'Create connector',
      arguments: [{ connectorType: getActionTypeIdFromStepType(connectorType), insertPosition }],
    },
  });

  return suggestions;
}

/**
 * Get connector instances for a specific connector type
 */
export function getConnectorInstancesForType(
  connectorType: string,
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): Array<{
  id: string;
  name: string;
  isPreconfigured: boolean;
  isDeprecated: boolean;
  connectorType: string;
}> {
  let resolvedConnectorTypes = [connectorType];

  if (aiSteps.includes(connectorType)) {
    resolvedConnectorTypes = aiConnectors;
  }

  return resolvedConnectorTypes
    .map((resolvedConnectorType) => {
      if (!dynamicConnectorTypes) {
        return [];
      }

      // For sub-action connectors (e.g., "inference.completion"), get the base type
      const baseConnectorType = resolvedConnectorType.includes('.')
        ? resolvedConnectorType.split('.')[0]
        : resolvedConnectorType;

      // Try multiple lookup strategies to find the connector type
      const lookupCandidates = [
        resolvedConnectorType, // Direct match (e.g., "slack")
        `.${resolvedConnectorType}`, // With dot prefix (e.g., ".slack")
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
    })
    .flat();
}
