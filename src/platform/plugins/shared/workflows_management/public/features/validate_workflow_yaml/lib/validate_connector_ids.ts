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
  const errors: YamlValidationResult[] = [];

  if (!dynamicConnectorTypes) {
    return [
      {
        id: 'connector-id-validation',
        severity: 'error',
        message: 'Dynamic connector types not found',
        source: 'connector-id-validation',
        hoverMessage: null,
        startLineNumber: 0,
        startColumn: 0,
        endLineNumber: 0,
        endColumn: 0,
      },
    ];
  }

  for (const connectorIdItem of connectorIdItems) {
    const instances = getConnectorInstancesForType(
      connectorIdItem.connectorType,
      dynamicConnectorTypes
    );

    if (
      !instances.some(
        (instance) => instance.id === connectorIdItem.key || instance.name === connectorIdItem.key
      )
    ) {
      errors.push({
        id: connectorIdItem.id,
        severity: 'error',
        message: `Connector id "${connectorIdItem.key}" not found for connector type ${connectorIdItem.connectorType}`,
        source: 'connector-id-validation',
        startLineNumber: connectorIdItem.startLineNumber,
        startColumn: connectorIdItem.startColumn,
        endLineNumber: connectorIdItem.endLineNumber,
        endColumn: connectorIdItem.endColumn,
        hoverMessage: `[Add new ${capitalize(
          connectorIdItem.connectorType
        )} connector](http://localhost:5601/app/management/ingest-management/connectors/types/create)`,
      });
    }
  }

  return errors;
}
