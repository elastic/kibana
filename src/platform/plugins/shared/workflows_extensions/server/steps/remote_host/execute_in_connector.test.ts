/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import { executeSubAction } from './execute_in_connector';

describe('executeSubAction', () => {
  const request = {} as KibanaRequest<unknown, unknown, unknown>;

  it('throws when the actions plugin is unavailable', async () => {
    await expect(
      executeSubAction({
        connectorId: 'conn-1',
        request,
        actionsStart: undefined,
        subAction: 'exec',
        subActionParams: { script: 'true' },
      })
    ).rejects.toThrow('Actions plugin is not available');
  });

  it('throws ConnectorExecutionError when the actions client returns an error', async () => {
    const execute = jest.fn().mockResolvedValue({
      status: 'error',
      message: 'connector failed',
    });
    const actionsStart = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({ execute }),
    } as unknown as ActionsPluginStartContract;

    await expect(
      executeSubAction({
        connectorId: 'conn-1',
        request,
        actionsStart,
        subAction: 'exec',
        subActionParams: { script: 'true' },
      })
    ).rejects.toBeInstanceOf(ExecutionError);
    await expect(
      executeSubAction({
        connectorId: 'conn-1',
        request,
        actionsStart,
        subAction: 'exec',
        subActionParams: { script: 'true' },
      })
    ).rejects.toMatchObject({
      type: 'ConnectorExecutionError',
      message: 'connector failed',
    });
    expect(execute).toHaveBeenCalledWith({
      actionId: 'conn-1',
      params: { subAction: 'exec', subActionParams: { script: 'true' } },
      signal: undefined,
    });
  });

  it('returns connector data on success', async () => {
    const execute = jest.fn().mockResolvedValue({
      status: 'ok',
      data: { stdout: '', stderr: '', code: 0 },
    });
    const actionsStart = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({ execute }),
    } as unknown as ActionsPluginStartContract;
    const abortSignal = new AbortController().signal;

    const result = await executeSubAction({
      connectorId: 'conn-1',
      request,
      actionsStart,
      subAction: 'exec',
      subActionParams: { script: 'true' },
      abortSignal,
    });

    expect(result).toEqual({ stdout: '', stderr: '', code: 0 });
    expect(execute).toHaveBeenCalledWith({
      actionId: 'conn-1',
      params: { subAction: 'exec', subActionParams: { script: 'true' } },
      signal: abortSignal,
    });
  });
});
