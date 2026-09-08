/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { ExecutionError } from '@kbn/workflows/server';
import { z } from '@kbn/zod/v4';
import type { ConnectorCallContext } from './execute_in_connector';
import type { RemoteHostJobStatus } from './remote_host_job';
import { killJob, parseScriptOutput, pollJob, startJob } from './remote_host_job';
import { remoteHostRunCommandStepCommonDefinition } from '../../../common/steps/remote_host';
import { createPollServerStepDefinition } from '../../step_registry/types';

const StateSchema = z.object({
  jobId: z.string(),
  stdoutOffset: z.number().default(0),
  stderrOffset: z.number().default(0),
});

interface Deps {
  getActionsStart: () => ActionsPluginStartContract | undefined;
}

const logCommandStreams = (
  logger: { info: (message: string) => void; warn: (message: string) => void },
  result: RemoteHostJobStatus
): void => {
  if (result.stdout) logger.info(result.stdout);
  if (result.stderr) logger.warn(result.stderr);
};

const completeCommand = (
  logger: { info: (message: string) => void; warn: (message: string) => void },
  result: RemoteHostJobStatus
): { output: unknown } => {
  logCommandStreams(logger, result);

  if (result.exitCode !== 0) {
    throw new ExecutionError({
      type: 'ScriptExecutionError',
      message: result.stderr || `Script exited with code ${result.exitCode}`,
      details: { exitCode: result.exitCode },
    });
  }

  return { output: parseScriptOutput(result.output) };
};

const toConnectorContext = (
  connectorId: string,
  context: {
    contextManager: { getFakeRequest: () => ConnectorCallContext['request'] };
    abortSignal: AbortSignal;
  },
  getActionsStart: () => ActionsPluginStartContract | undefined
): ConnectorCallContext => ({
  connectorId,
  request: context.contextManager.getFakeRequest(),
  actionsStart: getActionsStart(),
  abortSignal: context.abortSignal,
});

export const createRemoteHostRunCommandStepDefinition = ({ getActionsStart }: Deps) =>
  createPollServerStepDefinition({
    ...remoteHostRunCommandStepCommonDefinition,
    stateSchema: StateSchema,
    policy: {
      strategy: 'exponential',
      initialMs: 1000,
      maxMs: 5000,
    },
    ceilings: {
      maxAttempts: 20000,
      maxWaitMs: 60000,
    },
    start: async (context) => {
      const { code } = context.input;
      const connectorId = context.config['connector-id'];

      if (typeof code !== 'string' || code.trim().length === 0) {
        return { error: new Error('Code is required') };
      }

      const result = await startJob(
        toConnectorContext(connectorId, context, getActionsStart),
        code,
        context.input.env,
        context.input.cwd
      );

      if (result.status === 'running') {
        logCommandStreams(context.logger, result);
        return {
          state: {
            jobId: result.jobId,
            stdoutOffset: result.stdoutOffset,
            stderrOffset: result.stderrOffset,
          },
        };
      }

      return completeCommand(context.logger, result);
    },
    poll: async (context) => {
      const { config, state } = context;
      if (!state?.jobId) {
        throw new Error('Invalid state for polling remote command execution');
      }

      const result = await pollJob(
        toConnectorContext(config['connector-id'], context, getActionsStart),
        {
          jobId: state.jobId,
          stdoutOffset: state.stdoutOffset,
          stderrOffset: state.stderrOffset,
        }
      );

      if (result.status === 'running') {
        logCommandStreams(context.logger, result);
        return {
          state: {
            jobId: state.jobId,
            stdoutOffset: result.stdoutOffset,
            stderrOffset: result.stderrOffset,
          },
        };
      }

      return completeCommand(context.logger, result);
    },
    onCancel: async (context) => {
      const state = (context as { state?: z.infer<typeof StateSchema> }).state;
      if (!state?.jobId) {
        return;
      }

      await killJob(
        toConnectorContext(context.config['connector-id'], context, getActionsStart),
        state.jobId
      );
    },
  });
