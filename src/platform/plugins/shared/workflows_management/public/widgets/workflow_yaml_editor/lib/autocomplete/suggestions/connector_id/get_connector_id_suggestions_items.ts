/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { ConnectorTypeInfo } from '@kbn/workflows';

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

      // Add custom attributes for better CSS targeting
      filterText: `${instance.id} ${connectorName} ${connectorType}`, // Enhanced filter text for better targeting
    });
  });

  // If no instances are configured, still allow manual input
  if (instances.length === 0) {
    suggestions.push({
      label: 'Enter connector ID manually',
      kind: monaco.languages.CompletionItemKind.Text,
      insertText: '',
      range,
      detail: 'No configured instances found',
      documentation: `No instances of ${connectorType} are currently configured. You can enter a connector ID manually.`,
      sortText: 'z_manual',
    });
  }

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
}> {
  if (!dynamicConnectorTypes) {
    return [];
  }

  // For sub-action connectors (e.g., "inference.completion"), get the base type
  const baseConnectorType = connectorType.includes('.')
    ? connectorType.split('.')[0]
    : connectorType;

  // Try multiple lookup strategies to find the connector type
  const lookupCandidates = [
    connectorType, // Direct match (e.g., "slack")
    `.${connectorType}`, // With dot prefix (e.g., ".slack")
    baseConnectorType, // Base type for sub-actions (e.g., "inference" from "inference.completion")
    `.${baseConnectorType}`, // Base type with dot prefix (e.g., ".inference")
  ];

  for (const candidate of lookupCandidates) {
    const connectorTypeInfo = dynamicConnectorTypes[candidate];

    if (connectorTypeInfo?.instances?.length > 0) {
      return connectorTypeInfo.instances;
    }
  }

  return [];
}
