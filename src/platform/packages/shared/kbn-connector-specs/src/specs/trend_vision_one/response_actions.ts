/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { vendorRequest } from './client';
import { ACTION_DESCRIPTIONS } from './descriptions';
import type { TaskOutcome, UnknownTarget } from './multi_status';
import { toTaskOutcome } from './multi_status';
import type {
  AccountTaskInput,
  CollectFileInput,
  EmailTaskInput,
  EndpointTaskInput,
  GetTaskInput,
  TerminateProcessInput,
} from './response_types';
import {
  AccountTaskInputSchema,
  CollectFileInputSchema,
  EmailTaskInputSchema,
  EndpointTaskInputSchema,
  GetTaskInputSchema,
  TerminateProcessInputSchema,
} from './response_types';

/** Fields of a collect-file task that are a signed download link or its secret; never returned. */
const SIGNED_LINK_FIELDS = ['resourceLocation', 'password'];

/**
 * Removes the signed link fields at every depth (multi-target tasks carry them in tasks[] items);
 * an object that had a download link reports archiveReady instead.
 */
const withoutSignedLinks = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutSignedLinks);
  if (value === null || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  const result = Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => !SIGNED_LINK_FIELDS.includes(key))
      .map(([key, field]) => [key, withoutSignedLinks(field)])
  );
  if (!('resourceLocation' in source)) return result;
  const archiveReady =
    typeof source.resourceLocation === 'string' && source.resourceLocation !== '';
  return { ...result, archiveReady };
};

/** Drops undefined fields so the item carries only what the caller gave. */
const compact = (item: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));

/** Starts one response task: a one-item JSON array, answered with a 207 per-item status. */
export const startTask = async (
  ctx: ActionContext,
  action: string,
  path: string,
  item: object,
  unknownTarget?: UnknownTarget
): Promise<TaskOutcome> => {
  const { data } = await vendorRequest(ctx, {
    action,
    method: 'POST',
    path,
    data: [compact(item)],
    mutating: true,
  });
  return toTaskOutcome(action, data, unknownTarget);
};

/**
 * Restore answers an unknown endpointName with a per-item 500 (seen live), not "Target not found.";
 * the same 500 is also a server error, so the message names both causes.
 */
const UNKNOWN_ENDPOINT_NAME: UnknownTarget = {
  status: 500,
  hint: 'TrendAI Vision One answers 500 both for an endpointName it does not know and for a server error: check the name with listEndpoints or use agentGuid; if the name is right, retry later',
};

/** Handler of a response action: one target, one task. */
const taskHandler =
  <T extends object>(name: string, path: string) =>
  (ctx: ActionContext, input: T): Promise<TaskOutcome> =>
    startTask(ctx, name, path, { ...input });

export const responseActions: ConnectorSpec['actions'] = {
  isolateEndpoint: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.isolateEndpoint,
    input: EndpointTaskInputSchema,
    handler: taskHandler<EndpointTaskInput>('isolateEndpoint', '/response/endpoints/isolate'),
  },
  restoreEndpointConnection: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.restoreEndpointConnection,
    input: EndpointTaskInputSchema,
    handler: (ctx, input: EndpointTaskInput) =>
      startTask(
        ctx,
        'restoreEndpointConnection',
        '/response/endpoints/restore',
        { ...input },
        input.endpointName !== undefined ? UNKNOWN_ENDPOINT_NAME : undefined
      ),
  },
  terminateProcess: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.terminateProcess,
    input: TerminateProcessInputSchema,
    handler: taskHandler<TerminateProcessInput>(
      'terminateProcess',
      '/response/endpoints/terminateProcess'
    ),
  },
  collectForensicFile: {
    isTool: false,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.collectForensicFile,
    input: CollectFileInputSchema,
    handler: taskHandler<CollectFileInput>(
      'collectForensicFile',
      '/response/endpoints/collectFile'
    ),
  },
  quarantineEmailMessage: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.quarantineEmailMessage,
    input: EmailTaskInputSchema,
    handler: taskHandler<EmailTaskInput>('quarantineEmailMessage', '/response/emails/quarantine'),
  },
  deleteEmailMessage: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.deleteEmailMessage,
    input: EmailTaskInputSchema,
    handler: taskHandler<EmailTaskInput>('deleteEmailMessage', '/response/emails/delete'),
  },
  disableUserAccount: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.disableUserAccount,
    input: AccountTaskInputSchema,
    handler: taskHandler<AccountTaskInput>(
      'disableUserAccount',
      '/response/domainAccounts/disable'
    ),
  },
  enableUserAccount: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.enableUserAccount,
    input: AccountTaskInputSchema,
    handler: taskHandler<AccountTaskInput>('enableUserAccount', '/response/domainAccounts/enable'),
  },
  forceUserSignOut: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.forceUserSignOut,
    input: AccountTaskInputSchema,
    handler: taskHandler<AccountTaskInput>('forceUserSignOut', '/response/domainAccounts/signOut'),
  },

  getResponseTaskStatus: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getResponseTaskStatus,
    input: GetTaskInputSchema,
    handler: async (ctx, input: GetTaskInput) => {
      const { data } = await vendorRequest<Record<string, unknown>>(ctx, {
        action: 'getResponseTaskStatus',
        method: 'GET',
        path: `/response/tasks/${encodeURIComponent(input.id)}`,
        mutating: false,
        notFound: `Response task ${input.id}`,
      });
      return withoutSignedLinks(data ?? {});
    },
  },
};
