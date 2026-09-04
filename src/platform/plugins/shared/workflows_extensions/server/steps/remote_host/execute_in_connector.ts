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

export interface ConnectorCallContext {
  connectorId: string;
  request: KibanaRequest<unknown, unknown, unknown>;
  actionsStart: ActionsPluginStartContract | undefined;
  abortSignal?: AbortSignal;
}

export async function executeSubAction<T>(params: {
  connectorId: string;
  request: KibanaRequest<unknown, unknown, unknown>;
  actionsStart: ActionsPluginStartContract | undefined;
  subAction: string;
  subActionParams: Record<string, unknown>;
  abortSignal?: AbortSignal;
}): Promise<T> {
  const { connectorId, request, actionsStart, subAction, subActionParams, abortSignal } = params;

  if (!actionsStart) {
    throw new Error('Actions plugin is not available');
  }

  const actionsClient = await actionsStart.getActionsClientWithRequest(request);

  const result = await actionsClient.execute({
    actionId: connectorId,
    params: { subAction, subActionParams },
    signal: abortSignal,
  });

  if (result.status === 'error') {
    throw new ExecutionError({
      type: 'ConnectorExecutionError',
      message: result.message ?? 'Unknown error executing sub-action in connector',
      details: { ...result },
    });
  }

  return result.data as T;
}

export async function execScript(
  ctx: ConnectorCallContext,
  script: string
): Promise<{ stdout: string; stderr: string; code: number }> {
  return executeSubAction({
    ...ctx,
    subAction: 'exec',
    subActionParams: { script },
  });
}

export async function uploadFile(
  ctx: ConnectorCallContext,
  params: { remotePath: string; content: string }
): Promise<void> {
  await executeSubAction({
    ...ctx,
    subAction: 'uploadFile',
    subActionParams: {
      remotePath: params.remotePath,
      content: Buffer.from(params.content).toString('base64'),
      encoding: 'base64',
    },
  });
}

export async function downloadFile(ctx: ConnectorCallContext, remotePath: string): Promise<string> {
  const result = await executeSubAction<{ content: string; encoding: 'base64' }>({
    ...ctx,
    subAction: 'downloadFile',
    subActionParams: { remotePath },
  });
  return Buffer.from(result.content, 'base64').toString('utf-8');
}
