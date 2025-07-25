/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';

export class ConnectorExecutor {
  constructor(
    private connectorCredentials: Record<string, any>,
    private actionsClient: IUnsecuredActionsClient
  ) {}

  public async execute(
    connectorType: string,
    connectorName: string,
    inputs: Record<string, any>
  ): Promise<any> {
    if (!connectorType) {
      throw new Error('Connector type is required');
    }

    if (connectorType.endsWith('connector')) {
      await this.runConnector(connectorName, inputs);
      return;
    }

    return;
  }

  private async runConnector(
    connectorName: string,
    connectorParams: Record<string, any>
  ): Promise<void> {
    const connectorCredentials = this.connectorCredentials['connector.' + connectorName];

    if (!connectorCredentials) {
      throw new Error(`Connector credentials for "${connectorName}" not found`);
    }

    const connectorId = connectorCredentials.id;

    await this.actionsClient.execute({
      id: connectorId,
      params: connectorParams,
      spaceId: 'default',
      requesterId: 'background_task', // This is a custom ID for testing purposes
    });
  }
}
