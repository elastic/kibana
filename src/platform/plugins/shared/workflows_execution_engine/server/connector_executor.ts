/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import { validate as validateUuid } from 'uuid';

export class ConnectorExecutor {
  constructor(private actionsClient: IUnsecuredActionsClient) {}

  public async execute(
    connectorType: string,
    connectorName: string,
    inputs: Record<string, any>,
    spaceId: string
  ): Promise<ActionTypeExecutorResult<unknown>> {
    if (!connectorType) {
      throw new Error('Connector type is required');
    }

    return await this.runConnector(connectorName, inputs, spaceId);
  }

  private async runConnector(
    connectorName: string,
    connectorParams: Record<string, any>,
    spaceId: string
  ): Promise<ActionTypeExecutorResult<unknown>> {
    let connectorId: string;

    if (validateUuid(connectorName)) {
      connectorId = connectorName;
    } else {
      const allConnectors = await this.actionsClient.getAll('default');
      const connector = allConnectors.find((c) => c.name === connectorName);

      if (!connector) {
        throw new Error(`Connector with name ${connectorName} not found`);
      }

      connectorId = connector?.id;
    }

    return await this.actionsClient.execute({
      id: connectorId,
      params: connectorParams,
      spaceId,
      requesterId: 'background_task', // This is a custom ID for testing purposes
    });
  }
}
