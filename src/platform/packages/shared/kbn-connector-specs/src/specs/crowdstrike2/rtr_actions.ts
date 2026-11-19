/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import { parseProcessTable } from './format';
import { getCommandStatus, retrieveFile, runBatchCommand, runSingleHostCommand } from './rtr';
import type {
  BatchActiveResponderInput,
  BatchAdminInput,
  ExecuteRTRCommandInput,
  GetRTRCommandStatusInput,
  RtrKillProcessInput,
  RtrListProcessesInput,
  RtrRetrieveFileInput,
} from './types';
import {
  BatchActiveResponderInputSchema,
  BatchAdminInputSchema,
  ExecuteRTRCommandInputSchema,
  GetRTRCommandStatusInputSchema,
  RtrKillProcessInputSchema,
  RtrListProcessesInputSchema,
  RtrRetrieveFileInputSchema,
} from './types';

export const rtrActions: ConnectorSpec['actions'] = {
  executeRTRCommand: {
    isTool: true,
    scope: 'read',
    description:
      'Run a read-only Real Time Response command on up to 100 hosts. Returns results per host; when complete is false, poll cloud_request_id with getRTRCommandStatus, tier read_only.',
    input: ExecuteRTRCommandInputSchema,
    handler: async (ctx, input: ExecuteRTRCommandInput) => runBatchCommand(ctx, 'read_only', input),
  },
  batchActiveResponderExecuteRTR: {
    isTool: false,
    scope: 'destroy',
    description:
      'Run an active responder Real Time Response command on up to 10,000 hosts. Returns results per host; poll cloud_request_id with getRTRCommandStatus, tier active_responder.',
    input: BatchActiveResponderInputSchema,
    handler: async (ctx, input: BatchActiveResponderInput) =>
      runBatchCommand(ctx, 'active_responder', input),
  },
  batchAdminExecuteRTR: {
    isTool: false,
    scope: 'destroy',
    description:
      'Run an administrator Real Time Response command, including put and run, on up to 10,000 hosts. Returns results per host; poll cloud_request_id with getRTRCommandStatus, tier admin.',
    input: BatchAdminInputSchema,
    handler: async (ctx, input: BatchAdminInput) => runBatchCommand(ctx, 'admin', input),
  },
  getRTRCommandStatus: {
    isTool: true,
    scope: 'read',
    description:
      'Read a running Real Time Response command by cloud_request_id and the tier it ran in. Returns complete, stdout and stderr.',
    input: GetRTRCommandStatusInputSchema,
    handler: async (ctx, input: GetRTRCommandStatusInput) =>
      getCommandStatus(
        ctx,
        input.tier ?? 'read_only',
        input.cloud_request_id,
        input.sequence_id ?? 0
      ),
  },
  rtrRetrieveFile: {
    isTool: true,
    scope: 'write',
    description:
      'Collect one file, up to 1 MiB, from a host. Returns a 7z archive with the password infected as base64, with its sha256.',
    input: RtrRetrieveFileInputSchema,
    handler: async (ctx, input: RtrRetrieveFileInput) => retrieveFile(ctx, input),
  },
  rtrKillProcess: {
    isTool: false,
    scope: 'destroy',
    description: 'Kill a process by id on one host. A kill cannot be undone.',
    input: RtrKillProcessInputSchema,
    handler: async (ctx, input: RtrKillProcessInput) =>
      runSingleHostCommand(ctx, 'active_responder', {
        deviceId: input.device_id,
        baseCommand: 'kill',
        commandString: `kill ${input.process_id}`,
        timeout: input.timeout ?? 30,
      }),
  },
  rtrListProcesses: {
    isTool: true,
    scope: 'read',
    description: 'List the processes on one host. Returns stdout and the parsed rows.',
    input: RtrListProcessesInputSchema,
    handler: async (ctx, input: RtrListProcessesInput) => {
      const result = await runSingleHostCommand(ctx, 'read_only', {
        deviceId: input.device_id,
        baseCommand: 'ps',
        commandString: 'ps',
        timeout: input.timeout ?? 30,
      });
      return { ...result, processes: parseProcessTable(result.stdout ?? '') };
    },
  },
};
