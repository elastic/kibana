/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';

export const extractConnectorIds = async (
  workflow: WorkflowExecutionEngineModel,
  actionsClient: IUnsecuredActionsClient
): Promise<Record<string, Record<string, any>>> => {
  const connectorNames = workflow.steps
    .filter((step) => step.connectorType.endsWith('-connector'))
    .map((step) => step.connectorName);
  const distinctConnectorNames = Array.from(new Set(connectorNames));
  const allConnectors = await actionsClient.getAll('default');
  const connectorNameIdMap = new Map<string, string>(
    allConnectors.map((connector) => [connector.name, connector.id])
  );

  return distinctConnectorNames.reduce((acc, name) => {
    const connectorId = connectorNameIdMap.get(name);
    if (connectorId) {
      acc['connector.' + name] = {
        id: connectorId,
      };
    }
    return acc;
  }, {} as Record<string, Record<string, any>>);
};
