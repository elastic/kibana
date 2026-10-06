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
  status: 'running' | 'terminated' | 'lost';
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  stdoutOffset?: number;
  stderrOffset?: number;
  output?: string;
  pid?: number;
}): string =>
  JSON.stringify({
    status: payload.status,
    exitCode: payload.exitCode ?? 0,
    stdout: b64(payload.stdout ?? ''),
    stderr: b64(payload.stderr ?? ''),
    stdoutOffset: payload.stdoutOffset ?? 0,
    stderrOffset: payload.stderrOffset ?? 0,
    output: payload.output ? b64(payload.output) : '',
    ...(payload.pid != null ? { pid: payload.pid } : {}),
  });

const lostMessage = (pid: number, stderr?: string): string => {
  const message = `Remote command process ${pid} is no longer running and did not record an exit code. It was likely killed by the operating system or an external signal.`;
  return stderr ? `${message}\n${stderr}` : message;
};

describe('createRemoteHostRunCommandStepDefinition', () => {
  const definition = createRemoteHostRunCommandStepDefinition({
    getActionsStart: () => undefined,
  });

  const createContext = (
    overrides: {
      input?: { command: string };
      state?: { jobId: string; stdoutOffset: number; stderrOffset: number; polls?: number };
    } = {}
  ): PollHandlerContext<any, any, any> => {
    const input = overrides.input ?? { command: 'echo hi' };
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
      stepType: 'ssh.run',
      maxStepSizeBytes: 10 * 1024 * 1024,
    };

    return {
      ...base,
      state: overrides.state,
      attempt: 0,
    };
  };

  /** The first exec of startJob prepares the job dir and returns its root. Everything else gets `result`. */
  const mockLauncherResult = (result: { stdout: string; stderr: string; code: number }) => {
    mockedExecScript.mockImplementation(async (_ctx, script) =>
      script.includes('mkdir -m 700')
        ? { stdout: '/tmp/wf_remote_host_1000\n', stderr: '', code: 0 }
        : result
    );
  };

  beforeEach(() => {
    mockedExecScript.mockReset();
    mockedUploadFile.mockReset();
    mockedUploadFile.mockResolvedValue(undefined);
    mockLauncherResult({
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

    it('returns an error when command is empty', async () => {
      const result = await start()(createContext({ input: { command: '   ' } }));

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
          polls: 0,
        },
      });
      expect(mockedUploadFile).toHaveBeenCalledTimes(1);
      expect(mockedExecScript).toHaveBeenCalledTimes(2);
      expect(mockedExecScript).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('-gt 10485760')
      );
    });

    it('returns parsed STEP_OUTPUT when the command finishes within 2s', async () => {
      mockLauncherResult({
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
      mockLauncherResult({
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

    it('throws RemoteProcessLost when the process is already gone', async () => {
      mockLauncherResult({
        stdout: statusJson({
          status: 'lost',
          pid: 99,
          stderr: 'Killed',
        }),
        stderr: '',
        code: 0,
      });

      const context = createContext();
      await expect(start()(context)).rejects.toMatchObject({
        type: 'RemoteProcessLost',
        message: lostMessage(99, 'Killed'),
        details: { pid: 99 },
      });
      expect(context.logger.warn).toHaveBeenCalledWith('Killed');
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
        state: { jobId: 'job-1', stdoutOffset: 7, stderrOffset: 0, polls: 1 },
      });
    });

    it('kills the remote job and fails when the poll limit is reached', async () => {
      mockedExecScript.mockResolvedValue({ stdout: '', stderr: '', code: 0 });

      const context = createContext({ state: { ...runningState, polls: 20000 } });
      await expect(definition.poll(context)).rejects.toMatchObject({
        type: 'RemoteCommandTimeout',
      });

      expect(mockedExecScript).toHaveBeenCalledTimes(1);
      expect(mockedExecScript.mock.calls[0][1]).toContain('kill -9');
      expect(mockedExecScript.mock.calls[0][1]).toContain('rm -rf');
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

    it('keeps the job and polls again when the SSH host is unreachable', async () => {
      mockedExecScript.mockResolvedValue({
        stdout: '',
        stderr: 'Connection reset by peer',
        code: 255,
      });

      const context = createContext({
        state: { jobId: 'job-1', stdoutOffset: 4, stderrOffset: 2 },
      });
      const result = await definition.poll(context);

      expect(result).toEqual({
        state: { jobId: 'job-1', stdoutOffset: 4, stderrOffset: 2, polls: 1 },
      });
      expect(context.logger.warn).toHaveBeenCalledWith(
        'SSH host is unreachable (Connection reset by peer). The remote command is still running; polling will continue.'
      );
    });

    it('still fails when the status script exits with a non-SSH error', async () => {
      mockedExecScript.mockResolvedValue({ stdout: '', stderr: 'nope', code: 1 });

      await expect(definition.poll(createContext({ state: runningState }))).rejects.toThrow(
        'Failed to poll remote command: nope'
      );
    });

    it('throws RemoteProcessLost when the PID is gone and no exit code was recorded', async () => {
      mockedExecScript.mockResolvedValue({
        stdout: statusJson({
          status: 'lost',
          pid: 99,
          stderr: 'Killed',
        }),
        stderr: '',
        code: 0,
      });

      const context = createContext({ state: runningState });
      await expect(definition.poll(context)).rejects.toThrow(ExecutionError);
      await expect(definition.poll(context)).rejects.toMatchObject({
        type: 'RemoteProcessLost',
        message: lostMessage(99, 'Killed'),
        details: { pid: 99 },
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

    it('kills the job with a signal that is not already aborted', async () => {
      const context = createContext({
        state: { jobId: 'job-1', stdoutOffset: 0, stderrOffset: 0 },
      });
      const controller = new AbortController();
      controller.abort();
      await onCancel()({ ...context, abortSignal: controller.signal });

      const [callContext] = mockedExecScript.mock.calls[0];
      expect(callContext.abortSignal?.aborted).toBe(false);
    });
  });
});
