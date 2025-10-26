/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
/* eslint-disable @typescript-eslint/no-explicit-any */

import { validate as validateUuid } from 'uuid';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ActionsClient, IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';

export class ConnectorExecutor {
  constructor(
    private actionsClient: IUnsecuredActionsClient | ActionsClient,
    private isScoped: boolean = false
  ) {}

  public async execute(
    connectorType: string,
    connectorName: string,
    inputs: Record<string, any>,
    spaceId: string,
    abortController: AbortController
  ): Promise<ActionTypeExecutorResult<unknown>> {
    if (!connectorType) {
      throw new Error('Connector type is required');
    }

    const runConnectorPromise = this.runConnector(connectorName, inputs, spaceId);
    const abortPromise = new Promise<void>((resolve, reject) => {
      abortController.signal.addEventListener('abort', () =>
        reject(new Error(`"${connectorName}" with type "${connectorType}" was aborted`))
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
    connectorName: string,
    connectorParams: Record<string, any>,
    spaceId: string
  ): Promise<ActionTypeExecutorResult<unknown>> {
    const connectorId = await this.resolveConnectorId(connectorName, spaceId);

    if (this.isScoped) {
      return (this.actionsClient as ActionsClient).execute({
        actionId: connectorId,
        params: connectorParams,
      });
    }

    return (this.actionsClient as IUnsecuredActionsClient).execute({
      id: connectorId,
      params: connectorParams,
      spaceId,
      requesterId: 'background_task',
    });
  }

  private async resolveConnectorId(connectorName: string, spaceId: string): Promise<string> {
    if (validateUuid(connectorName)) {
      return connectorName;
    }

    const allConnectors = this.isScoped
      ? await (this.actionsClient as ActionsClient).getAll()
      : await (this.actionsClient as IUnsecuredActionsClient).getAll(spaceId);

    const connector = allConnectors.find(
      (c: ConnectorWithExtraFindData) => c.name === connectorName
    );

    if (!connector) {
      throw new Error(`Connector with name ${connectorName} not found`);
    }

    return connector.id;
  }
}
