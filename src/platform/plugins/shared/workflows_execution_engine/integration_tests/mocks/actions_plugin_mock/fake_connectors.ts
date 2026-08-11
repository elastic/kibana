/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';

export const FakeConnectors = {
  slack1: {
    id: 'a1b2c3d4-e5f6-7890-ab12-cd34ef567890',
    actionTypeId: 'slack',
    name: 'fake_slack_connector_1',
  },
  slack2: {
    id: 'c3d4e5f6-a7b8-9012-cd34-ef56ab789012',
    actionTypeId: 'slack',
    name: 'fake_slack_connector_2',
  },
  /** Returns input value as connector result */
  echo_inference: {
    id: 'b2c3d4e5-f6a7-8901-bc23-de45fa678902',
    actionTypeId: 'inference',
    name: 'inference_connector',
  },
  constantlyFailing: {
    id: 'b2c3d4e5-f6a7-8901-bc23-de45fa678901',
    actionTypeId: 'slack',
    name: 'fake_slack_failing_connector',
  },
  slow_3sec_inference: {
    id: 'd4e5f6a7-b8c9-0123-de45-fa67bc890123',
    actionTypeId: 'inference',
    name: 'slow_3sec_inference_connector',
  },
  slow_1sec_inference: {
    id: 'e5f6a7b8-b8c9-0123-de45-cd34ef567890',
    actionTypeId: 'inference',
    name: 'slow_2sec_inference_connector',
  },
  slow_3sec_failing_inference: {
    id: 'e5f6a7b8-c9d0-1234-ef56-ab78cd901234',
    actionTypeId: 'inference',
    name: 'slow_3sec_failing_inference_connector',
  },
  /** Returns a large payload (configurable size via params.sizeBytes, default 5KB) */
  large_response: {
    id: 'f6a7b8c9-d0e1-2345-fa67-bc89de012345',
    actionTypeId: 'inference',
    name: 'large_response_connector',
  },
};

export async function getMockedConnectorResult(
  id: string,
  params: Record<string, unknown>
): Promise<ActionTypeExecutorResult<unknown>> {
  const fakeConnector = Object.values(FakeConnectors).find((c) => c.id === id);

  switch (fakeConnector?.name) {
    case FakeConnectors.slack1.name:
    case FakeConnectors.slack2.name: {
      return {
        status: 'ok',
        actionId: id,
        data: { text: 'ok' },
      };
    }
    case FakeConnectors.echo_inference.name: {
      return {
        status: 'ok',
        actionId: id,
        data: [
          {
            result: params?.text,
          },
        ],
      };
    }
    case FakeConnectors.constantlyFailing.name: {
      throw new Error('Error: Constantly failing connector');
    }
    case FakeConnectors.slow_1sec_inference.name: {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
      return {
        status: 'ok',
        actionId: id,
        data: [
          {
            result: 'Hello! How can I help you?',
          },
        ],
      };
    }
    case FakeConnectors.slow_3sec_inference.name: {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 3000));
      return {
        status: 'ok',
        actionId: id,
        data: [
          {
            result: 'Hello! How can I help you?',
          },
        ],
      };
    }
    case FakeConnectors.large_response.name: {
      const sizeBytes = typeof params?.sizeBytes === 'number' ? params?.sizeBytes : 5 * 1024;
      const largePayload = 'x'.repeat(sizeBytes);
      return {
        status: 'ok' as const,
        actionId: id,
        data: { payload: largePayload },
      };
    }
  }

  throw new Error(`Connector with id ${id} not found in mock`);
}
