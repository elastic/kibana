/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionError } from '@kbn/workflows/server';
import { execScript, uploadFile } from './execute_in_connector';
import { createRemoteHostRunCommandStepDefinition } from './remote_host_run_command_step';
import type { PollHandlerContext, StepHandlerContext } from '../../step_registry/types';

jest.mock('./execute_in_connector', () => ({
  executeSubAction: jest.fn(),
  execScript: jest.fn(),
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
}));

const mockedExecScript = execScript as jest.MockedFunction<typeof execScript>;
const mockedUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>;

const b64 = (value: string): string => Buffer.from(value).toString('base64');

const statusJson = (payload: {
  status: 'running' | 'terminated';
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  stdoutOffset?: number;
  stderrOffset?: number;
  output?: string;
}): string =>
  JSON.stringify({
    status: payload.status,
    exitCode: payload.exitCode ?? 0,
    stdout: b64(payload.stdout ?? ''),
    stderr: b64(payload.stderr ?? ''),
    stdoutOffset: payload.stdoutOffset ?? 0,
    stderrOffset: payload.stderrOffset ?? 0,
    output: payload.output ? b64(payload.output) : '',
  });

describe('createRemoteHostRunCommandStepDefinition', () => {
  const definition = createRemoteHostRunCommandStepDefinition({
    getActionsStart: () => undefined,
  });

  const createContext = (
    overrides: {
      input?: { code: string };
      state?: { jobId: string; stdoutOffset: number; stderrOffset: number };
    } = {}
  ): PollHandlerContext<any, any, any> => {
    const input = overrides.input ?? { code: 'echo hi' };
    const base: StepHandlerContext<any, any> = {
      config: { 'connector-id': 'conn-1' },
      input,
      rawInput: input,
      contextManager: {
        getContext: jest.fn(),
        getFakeRequest: jest.fn().mockReturnValue({}),
        getScopedEsClient: jest.fn(),
        renderInputTemplate: jest.fn((val) => val),
        callKibanaApi: jest.fn(),
      },
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      abortSignal: new AbortController().signal,
      stepId: 'run-command',
      stepType: 'remoteHost.runCommand',
    };

    return {
      ...base,
      state: overrides.state,
      attempt: 0,
    };
  };

  beforeEach(() => {
    mockedExecScript.mockReset();
    mockedUploadFile.mockReset();
    mockedUploadFile.mockResolvedValue(undefined);
    mockedExecScript.mockResolvedValue({
      stdout: statusJson({ status: 'running' }),
      stderr: '',
      code: 0,
    });
  });

  describe('start', () => {
    const start = () => {
      const { start: startHandler } = definition;
      if (!startHandler) {
        throw new Error('expected start handler');
      }
      return startHandler;
    };

    it('returns an error when code is empty', async () => {
      const result = await start()(createContext({ input: { code: '   ' } }));

      expect(result).toEqual({ error: expect.any(Error) });
      expect(mockedUploadFile).not.toHaveBeenCalled();
    });

    it('hands off to poll when the command is still running after 2s', async () => {
      const result = await start()(createContext());

      expect(result).toEqual({
        state: {
          jobId: expect.any(String),
          stdoutOffset: 0,
          stderrOffset: 0,
        },
      });
      expect(mockedUploadFile).toHaveBeenCalledTimes(1);
      expect(mockedExecScript).toHaveBeenCalledTimes(1);
    });

    it('returns parsed STEP_OUTPUT when the command finishes within 2s', async () => {
      mockedExecScript.mockResolvedValue({
        stdout: statusJson({
          status: 'terminated',
          stdout: 'logged',
          output: '{"hostname":"box"}',
        }),
        stderr: '',
        code: 0,
      });

      const result = await start()(createContext());

      expect(result).toEqual({ output: { hostname: 'box' } });
    });

    it('throws ScriptExecutionError when a short command exits non-zero', async () => {
      mockedExecScript.mockResolvedValue({
        stdout: statusJson({
          status: 'terminated',
          exitCode: 2,
          stderr: 'failed',
        }),
        stderr: '',
        code: 0,
      });

      await expect(start()(createContext())).rejects.toMatchObject({
        type: 'ScriptExecutionError',
        message: 'failed',
      });
    });
  });

  describe('poll', () => {
    const runningState = { jobId: 'job-1', stdoutOffset: 0, stderrOffset: 0 };

    it('throws when state has no jobId', async () => {
      await expect(definition.poll(createContext({ state: undefined }))).rejects.toThrow(
        'Invalid state for polling remote command execution'
      );
    });

    it('continues polling while the remote command is running', async () => {
      mockedExecScript.mockResolvedValue({
        stdout: statusJson({
          status: 'running',
          stdout: 'partial',
          stdoutOffset: 7,
          stderrOffset: 0,
        }),
        stderr: '',
        code: 0,
      });

      const result = await definition.poll(createContext({ state: runningState }));

      expect(result).toEqual({
        state: { jobId: 'job-1', stdoutOffset: 7, stderrOffset: 0 },
      });
    });

    it('returns parsed STEP_OUTPUT when the command terminates successfully', async () => {
      mockedExecScript.mockResolvedValue({
        stdout: statusJson({
          status: 'terminated',
          stdout: 'logged',
          output: '{"hostname":"box"}',
          stdoutOffset: 6,
        }),
        stderr: '',
        code: 0,
      });

      const result = await definition.poll(createContext({ state: runningState }));

      expect(result).toEqual({ output: { hostname: 'box' } });
    });

    it('throws ScriptExecutionError when the command exits non-zero', async () => {
      mockedExecScript.mockResolvedValue({
        stdout: statusJson({
          status: 'terminated',
          exitCode: 2,
          stderr: 'failed',
        }),
        stderr: '',
        code: 0,
      });

      await expect(definition.poll(createContext({ state: runningState }))).rejects.toThrow(
        ExecutionError
      );
      await expect(definition.poll(createContext({ state: runningState }))).rejects.toMatchObject({
        type: 'ScriptExecutionError',
        message: 'failed',
      });
    });
  });

  describe('onCancel', () => {
    const onCancel = () => {
      const { onCancel: onCancelHandler } = definition;
      if (!onCancelHandler) {
        throw new Error('expected onCancel handler');
      }
      return onCancelHandler;
    };

    it('does nothing when there is no jobId', async () => {
      await onCancel()(createContext({ state: undefined }));

      expect(mockedExecScript).not.toHaveBeenCalled();
    });

    it('kills the remote job when state has a jobId', async () => {
      await onCancel()(
        createContext({ state: { jobId: 'job-1', stdoutOffset: 0, stderrOffset: 0 } })
      );

      expect(mockedExecScript).toHaveBeenCalledTimes(1);
      expect(mockedExecScript.mock.calls[0][1]).toContain('pid.txt');
    });
  });
});
