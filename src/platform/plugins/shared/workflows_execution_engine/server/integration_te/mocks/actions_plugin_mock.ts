/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';

export const FakeConnectors = {
  slack1: {
    id: '57750ec9-e673-4f79-b0d8-20253d21402e',
    actionTypeId: '.slack',
    name: 'fake_slack_connector_1',
  },
  slack2: {
    id: '61150ec9-e673-4f79-c0d8-30253d21405e',
    actionTypeId: '.slack',
    name: 'fake_slack_connector_2',
  },
};

export class UnsecuredActionsClientMock implements IUnsecuredActionsClient {
  getAll = jest
    .fn()
    .mockResolvedValue(Object.values(FakeConnectors) as ConnectorWithExtraFindData[]);
  execute = jest.fn().mockImplementation((options) => this.returnMockedConnectorResult(options));
  bulkEnqueueExecution = jest.fn().mockResolvedValue(undefined);

  private returnMockedConnectorResult({
    id,
  }: {
    id: string;
    params: Record<string, any>;
    spaceId: string;
    requesterId: string; // This is a custom ID for testing purposes
  }): Promise<ActionTypeExecutorResult<unknown>> {
    const fakeConnector = Object.values(FakeConnectors).find((c) => c.id === id);

    if (fakeConnector) {
      return Promise.resolve({
        status: 'ok',
        actionId: id,
        data: { text: 'ok' },
      });
    }

    throw new Error(`Connector with id ${id} not found in mock`);
  }
}
