/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';

export class ConnectorExecutor {
  constructor(private actionsClient: ActionsClient) {}

  // Execute a regular connector with a saved object. It will resolve the connector ID from saved objects.
  public async execute(params: {
    connectorType: string;
    connectorNameOrId: string;
    input: Record<string, unknown>;
    abortController: AbortController;
  }): Promise<ActionTypeExecutorResult<unknown>> {
    const { connectorType, connectorNameOrId, input, abortController } = params;
    if (!connectorType) {
      throw new Error('Connector type is required');
    }

    const actionId = await this.resolveConnectorId(connectorNameOrId);

    return this.runConnector({ actionTypeId: connectorType, actionId, input, abortController });
  }

  // Execute a system connector. It will use the provided connector ID directly.
  public async executeSystemConnector(params: {
    connectorType: string;
    input: Record<string, unknown>;
    abortController: AbortController;
  }): Promise<ActionTypeExecutorResult<unknown>> {
    const { connectorType, input, abortController } = params;
    if (!connectorType) {
      throw new Error('Connector type is required');
    }
    // The InMemoryConnector with prefixed "system-connector-" is created by the actions framework
    const actionId = `system-connector-${connectorType}`;

    return this.runConnector({ actionTypeId: connectorType, actionId, input, abortController });
  }

  // Execute a connector. It listens for the abort signal and rejects the promise if it is triggered.
  private async runConnector(params: {
    actionTypeId: string;
    actionId: string;
    input: Record<string, unknown>;
    abortController: AbortController;
  }): Promise<ActionTypeExecutorResult<unknown>> {
    const { actionTypeId, actionId, input, abortController } = params;

    const executeActionPromise = this.actionsClient.execute({
      actionId,
      params: input,
      signal: abortController.signal,
    });

    const abortPromise = new Promise<ActionTypeExecutorResult<unknown>>((_resolve, reject) => {
      abortController.signal.addEventListener(
        'abort',
        () => reject(this.createAbortError(actionTypeId, actionId)),
        { once: true }
      );
    });

    // If the abort signal is triggered, the abortPromise will reject first
    // Otherwise, the executeActionPromise will resolve first
    // This ensures that we handle cancellation properly.
    // In the future, if all connectors support cancellation, we can remove this logic.
    return Promise.race([abortPromise, executeActionPromise]);
  }

  private createAbortError(actionTypeId: string, actionId: string): Error {
    return new Error(`Action type "${actionTypeId}" with ID "${actionId}" execution was aborted`);
  }

  private async resolveConnectorId(connectorName: string): Promise<string> {
    const allConnectors = await this.actionsClient.getAll();

    const connector = allConnectors.find(
      (c: ConnectorWithExtraFindData) => c.name === connectorName || c.id === connectorName
    );

    if (!connector) {
      throw new Error(`Connector ${connectorName} not found`);
    }

    return connector.id;
  }
}
