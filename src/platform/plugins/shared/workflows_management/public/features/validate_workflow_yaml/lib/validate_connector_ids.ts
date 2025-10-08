/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { capitalize } from 'lodash';
import { getConnectorInstancesForType } from '../../../widgets/workflow_yaml_editor/lib/snippets/generate_connector_snippet';
import type { ConnectorIdItem, YamlValidationResult } from '../model/types';

export function validateConnectorIds(
  connectorIdItems: ConnectorIdItem[],
  dynamicConnectorTypes: Record<string, any> | null
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  if (!dynamicConnectorTypes) {
    return [
      {
        id: 'connector-id-validation',
        severity: 'error',
        message: 'Dynamic connector types not found',
        owner: 'connector-id-validation',
        startLineNumber: 0,
        startColumn: 0,
        endLineNumber: 0,
        endColumn: 0,
        afterMessage: null,
        hoverMessage: null,
      },
    ];
  }

  for (const connectorIdItem of connectorIdItems) {
    const instances = getConnectorInstancesForType(
      connectorIdItem.connectorType,
      dynamicConnectorTypes
    );

    const instance = instances.find(
      (ins) => ins.id === connectorIdItem.key || ins.name === connectorIdItem.key
    );

    if (!instance) {
      results.push({
        id: connectorIdItem.id,
        severity: 'error',
        message: `Connector id "${connectorIdItem.key}" not found for connector type ${connectorIdItem.connectorType}`,
        owner: 'connector-id-validation',
        startLineNumber: connectorIdItem.startLineNumber,
        startColumn: connectorIdItem.startColumn,
        endLineNumber: connectorIdItem.endLineNumber,
        endColumn: connectorIdItem.endColumn,
        afterMessage: `Not connected. [Add new ${capitalize(
          connectorIdItem.connectorType
        )} connector](http://localhost:5601/app/management/ingest-management/connectors/types/create)`,
        hoverMessage: null,
      });
    } else {
      results.push({
        id: connectorIdItem.id,
        severity: null,
        message: null,
        owner: 'connector-id-validation',
        startLineNumber: connectorIdItem.startLineNumber,
        startColumn: connectorIdItem.startColumn,
        endLineNumber: connectorIdItem.endLineNumber,
        endColumn: connectorIdItem.endColumn,
        afterMessage: `✓ Connected (${capitalize(connectorIdItem.connectorType)} connector, ID: ${
          instance.id
        })`,
        hoverMessage: null,
      });
    }
  }

  return results;
}
