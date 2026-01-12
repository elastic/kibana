/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validate as validateUuid } from 'uuid';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';

export class ConnectorExecutor {
  constructor(private actionsClient: ActionsClient) {}

  public async execute(params: {
    connectorType: string;
    connectorNameOrId: string;
    input: Record<string, unknown>;
    abortController: AbortController;
    isSystemAction?: boolean;
  }): Promise<ActionTypeExecutorResult<unknown>> {
    const { connectorType, connectorNameOrId, input, abortController, isSystemAction } = params;
    if (!connectorType) {
      throw new Error('Connector type is required');
    }

    const runConnectorPromise = this.runConnector(connectorNameOrId, input, isSystemAction);

    const abortPromise = new Promise<void>((resolve, reject) => {
      abortController.signal.addEventListener('abort', () =>
        reject(new Error(`"${connectorNameOrId}" with type "${connectorType}" was aborted`))
      );
    });

    // If the abort signal is triggered, the abortPromise will reject first
    // Otherwise, the runConnectorPromise will resolve first
    // This ensures that we handle cancellation properly.
    // This is a workaround for the fact that connectors do not natively support cancellation.
    // In the future, if connectors support cancellation, we can remove this logic.
    await Promise.race([abortPromise, runConnectorPromise]);
    return runConnectorPromise;
  }

  private async runConnector(
    connectorNameOrId: string,
    connectorParams: Record<string, unknown>,
    isSystemAction?: boolean
  ): Promise<ActionTypeExecutorResult<unknown>> {
    let actionId = connectorNameOrId;
    if (!isSystemAction) {
      actionId = await this.resolveConnectorId(connectorNameOrId);
    }

    return this.actionsClient.execute({ actionId, params: connectorParams });
  }

  private async resolveConnectorId(connectorName: string): Promise<string> {
    if (validateUuid(connectorName)) {
      return connectorName;
    }

    const allConnectors = await this.actionsClient.getAll();

    const connector = allConnectors.find(
      (c: ConnectorWithExtraFindData) => c.name === connectorName
    );

    if (!connector) {
      throw new Error(`Connector with name ${connectorName} not found`);
    }

    return connector.id;
  }
}
