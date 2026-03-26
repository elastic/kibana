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
import { FakeConnectors, getMockedConnectorResult } from './fake_connectors';

export class ScopedActionsClientMock implements Partial<ActionsClient> {
  getAll = jest
    .fn()
    .mockResolvedValue(Object.values(FakeConnectors) as ConnectorWithExtraFindData[]);
  execute = jest.fn().mockImplementation((options) => this.returnMockedConnectorResult(options));
  bulkEnqueueExecution = jest.fn().mockResolvedValue(undefined);

  public async returnMockedConnectorResult({
    actionId,
    params,
  }: {
    actionId: string;
    params: Record<string, unknown>;
  }): Promise<ActionTypeExecutorResult<unknown>> {
    return getMockedConnectorResult(actionId, params);
  }
}
