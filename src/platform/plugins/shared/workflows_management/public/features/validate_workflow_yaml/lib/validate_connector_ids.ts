/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorTypeInfo } from '@kbn/workflows';
import { getConnectorInstancesForType } from '../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/connector_id/get_connector_id_suggestions_items';
import type { ConnectorIdItem, YamlValidationResult } from '../model/types';

export function validateConnectorIds(
  connectorIdItems: ConnectorIdItem[],
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo> | null,
  connectorsManagementUrl?: string
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  if (!dynamicConnectorTypes) {
    const errorResult: YamlValidationResult = {
      id: 'connector-id-validation',
      severity: 'error',
      message: 'Dynamic connector types not found',
      owner: 'connector-id-validation',
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: 0,
      endColumn: 0,
      afterMessage: null,
      beforeMessage: null,
      hoverMessage: null,
    };
    return [errorResult];
  }

  const notReferenceConnectorIds = connectorIdItems.filter(
    (item) => !item.key?.startsWith('${{') || !item.key.endsWith('}}')
  );

  for (const connectorIdItem of notReferenceConnectorIds) {
    const connectorType = dynamicConnectorTypes[connectorIdItem.connectorType];
    const displayName = connectorType?.displayName ?? connectorIdItem.connectorType;
    const instances = getConnectorInstancesForType(
      connectorIdItem.connectorType,
      dynamicConnectorTypes
    );

    const instance = instances.find((ins) => ins.id === connectorIdItem.key);

    if (!instance) {
      const errorResult: YamlValidationResult = {
        id: connectorIdItem.id,
        severity: 'error',
        message: `${displayName} connector UUID "${connectorIdItem.key}" not found. Add a new connector or choose an existing one`,
        owner: 'connector-id-validation',
        startLineNumber: connectorIdItem.startLineNumber,
        startColumn: connectorIdItem.startColumn,
        endLineNumber: connectorIdItem.endLineNumber,
        endColumn: connectorIdItem.endColumn,
        afterMessage: null,
        beforeMessage: null,
        hoverMessage: connectorsManagementUrl
          ? `[Open connectors management](${connectorsManagementUrl})`
          : null,
      };
      results.push(errorResult);
    } else {
      const validResult: YamlValidationResult = {
        id: connectorIdItem.id,
        severity: null,
        message: null,
        owner: 'connector-id-validation',
        startLineNumber: connectorIdItem.startLineNumber,
        startColumn: connectorIdItem.startColumn,
        endLineNumber: connectorIdItem.endLineNumber,
        endColumn: connectorIdItem.endColumn,
        beforeMessage: `✓ ${instance.name}`,
        afterMessage: null,
        hoverMessage: null,
      };
      results.push(validResult);
    }
  }

  return results;
}
