/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { z } from '@kbn/zod/v4';
import { remoteHostRunCommandStepCommonDefinition } from '../../../common/steps/remote_host';
import { createPollServerStepDefinition } from '../../step_registry/types';
import {
  executeCommandInConnector,
  killCommandInConnector,
  tryExtractCommandOutputFromConnector,
} from './execute_in_connector';
import { ExecutionError } from '@kbn/workflows/server';

const StateSchema = z.object({
  commandId: z.string(),
});

const parseScriptOutput = (raw: string | undefined): unknown => {
  if (raw === undefined || raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

interface Deps {
  getActionsStart: () => ActionsPluginStartContract | undefined;
}

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

      const result = await executeCommandInConnector({
        connectorId,
        request: context.contextManager.getFakeRequest(),
        actionsStart: getActionsStart(),
        script: code,
        abortSignal: context.abortSignal,
      });

      if (result.stdout) context.logger.info(result.stdout);
      if (result.stderr) context.logger.warn(result.stderr);

      if (result.status === 'running') {
        return { state: { commandId: result.commandId } };
      }

      if (result.exitCode !== 0) {
        throw new ExecutionError({
          type: 'ScriptExecutionError',
          message: result.stderr || `Script exited with code ${result.exitCode}`,
          details: { exitCode: result.exitCode },
        });
      }

      return { output: parseScriptOutput(result.output) };
    },
    poll: async (context) => {
      const { config, state, contextManager } = context;
      if (!state?.commandId) {
        throw new Error('Invalid state for polling remote command execution');
      }

      const result = await tryExtractCommandOutputFromConnector({
        connectorId: config['connector-id'],
        request: contextManager.getFakeRequest(),
        actionsStart: getActionsStart(),
        commandId: state.commandId,
      });

      if (result.stdout) context.logger.info(result.stdout);
      if (result.stderr) context.logger.warn(result.stderr);

      if (result.status === 'running') {
        return undefined;
      }

      if (result.exitCode !== 0) {
        throw new ExecutionError({
          type: 'ScriptExecutionError',
          message: result.stderr || `Script exited with code ${result.exitCode}`,
          details: { exitCode: result.exitCode },
        });
      }

      return { output: parseScriptOutput(result.output) };
    },
    onCancel: async (context) => {
      const { config, contextManager } = context;
      const state = (context as { state?: z.infer<typeof StateSchema> }).state;

      if (!state?.commandId) {
        return;
      }

      await killCommandInConnector({
        connectorId: config['connector-id'],
        request: contextManager.getFakeRequest(),
        actionsStart: getActionsStart(),
        commandId: state.commandId,
      });
    },
  });
