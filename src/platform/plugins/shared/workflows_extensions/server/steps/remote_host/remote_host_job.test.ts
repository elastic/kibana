/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorCallContext } from './execute_in_connector';
import { execScript, uploadFile } from './execute_in_connector';
import {
  getWorkdir,
  killJob,
  parseJobStatus,
  parseScriptOutput,
  pollJob,
  startJob,
  wrapUserScript,
} from './remote_host_job';

jest.mock('./execute_in_connector', () => ({
  executeSubAction: jest.fn(),
  execScript: jest.fn(),
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
}));

const mockedExecScript = execScript as jest.MockedFunction<typeof execScript>;
const mockedUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>;

const ctx = {
  connectorId: 'conn-1',
  request: {} as ConnectorCallContext['request'],
  actionsStart: {} as ConnectorCallContext['actionsStart'],
} as ConnectorCallContext;

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

describe('wrapUserScript', () => {
  it('wraps user code with a STEP_OUTPUT EXIT trap', () => {
    const wrapped = wrapUserScript('hostname -f');

    expect(wrapped).toContain("STEP_OUTPUT=''");
    expect(wrapped).toContain('printf \'%s\' "$STEP_OUTPUT" > "$WORKDIR/output.txt"');
    expect(wrapped).toContain("trap '_capture_output' EXIT");
    expect(wrapped).toContain('hostname -f');
  });
});

describe('parseScriptOutput', () => {
  it('returns null for undefined', () => {
    expect(parseScriptOutput(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseScriptOutput('')).toBeNull();
  });

  it('parses valid JSON', () => {
    expect(parseScriptOutput('{"hostname":"box"}')).toEqual({ hostname: 'box' });
  });

  it('returns the raw string when JSON parsing fails', () => {
    expect(parseScriptOutput('not-json')).toBe('not-json');
  });
});

describe('parseJobStatus', () => {
  it('decodes a terminated status JSON line', () => {
    const result = parseJobStatus(
      statusJson({
        status: 'terminated',
        exitCode: 0,
        stdout: 'hello',
        stderr: 'warn',
        stdoutOffset: 5,
        stderrOffset: 4,
        output: '{"ok":true}',
      })
    );

    expect(result).toEqual({
      status: 'terminated',
      stdout: 'hello',
      stderr: 'warn',
      stdoutOffset: 5,
      stderrOffset: 4,
      exitCode: 0,
      output: '{"ok":true}',
    });
  });

  it('uses the last line when stdout has leading noise', () => {
    const result = parseJobStatus(
      `debug: ignored\n${statusJson({ status: 'running', stdout: 'partial' })}`
    );

    expect(result.status).toBe('running');
    expect(result.stdout).toBe('partial');
    expect(result.output).toBeUndefined();
  });

  it('throws when stdout is empty', () => {
    expect(() => parseJobStatus('')).toThrow('empty stdout');
  });

  it('throws when the last line is not JSON', () => {
    expect(() => parseJobStatus('STATUS=DONE')).toThrow('invalid JSON');
  });
});

describe('startJob', () => {
  beforeEach(() => {
    mockedUploadFile.mockReset();
    mockedExecScript.mockReset();
    mockedUploadFile.mockResolvedValue(undefined);
    mockedExecScript.mockResolvedValue({
      stdout: statusJson({ status: 'running' }),
      stderr: '',
      code: 0,
    });
  });

  it('uploads the wrapped script, waits up to 2s, and hands off when still running', async () => {
    const result = await startJob(ctx, 'echo hi');

    expect(result).toMatchObject({
      jobId: expect.any(String),
      status: 'running',
      stdoutOffset: 0,
      stderrOffset: 0,
    });
    expect(mockedUploadFile).toHaveBeenCalledWith(ctx, {
      remotePath: `${getWorkdir(result.jobId)}/script.sh`,
      content: expect.stringContaining('echo hi'),
    });
    expect(mockedExecScript).toHaveBeenCalledWith(ctx, expect.stringContaining('TIMEOUT=20'));
    expect(mockedExecScript).toHaveBeenCalledWith(
      ctx,
      expect.stringContaining(`setsid bash -c 'WORKDIR="${getWorkdir(result.jobId)}"`)
    );
  });

  it('returns terminated status when the command finishes within 2s', async () => {
    mockedExecScript.mockResolvedValue({
      stdout: statusJson({
        status: 'terminated',
        stdout: 'hello',
        output: '{"ok":true}',
      }),
      stderr: '',
      code: 0,
    });

    const result = await startJob(ctx, 'echo hi');

    expect(result.status).toBe('terminated');
    expect(result.stdout).toBe('hello');
    expect(result.output).toBe('{"ok":true}');
  });

  it('throws when the launcher exits non-zero', async () => {
    mockedExecScript.mockResolvedValue({ stdout: '', stderr: 'boom', code: 1 });

    await expect(startJob(ctx, 'echo hi')).rejects.toThrow('Failed to start remote command: boom');
  });
});

describe('pollJob', () => {
  beforeEach(() => {
    mockedExecScript.mockReset();
  });

  it('parses a running status payload', async () => {
    mockedExecScript.mockResolvedValue({
      stdout: statusJson({ status: 'running', stdout: 'out', stdoutOffset: 3 }),
      stderr: '',
      code: 0,
    });

    const result = await pollJob(ctx, { jobId: 'job-1', stdoutOffset: 0, stderrOffset: 0 });

    expect(result.status).toBe('running');
    expect(result.stdout).toBe('out');
    expect(result.stdoutOffset).toBe(3);
    expect(mockedExecScript).toHaveBeenCalledWith(
      ctx,
      expect.stringContaining(`${getWorkdir('job-1')}/code.txt`)
    );
  });

  it('throws when the status script exits non-zero', async () => {
    mockedExecScript.mockResolvedValue({ stdout: '', stderr: 'nope', code: 1 });

    await expect(
      pollJob(ctx, { jobId: 'job-1', stdoutOffset: 0, stderrOffset: 0 })
    ).rejects.toThrow('Failed to poll remote command: nope');
  });
});

describe('killJob', () => {
  beforeEach(() => {
    mockedExecScript.mockReset();
    mockedExecScript.mockResolvedValue({ stdout: '', stderr: '', code: 0 });
  });

  it('runs the kill script for the job workdir', async () => {
    await killJob(ctx, 'job-1');

    expect(mockedExecScript).toHaveBeenCalledWith(
      ctx,
      expect.stringContaining(`${getWorkdir('job-1')}/pid.txt`)
    );
  });

  it('throws when the kill script exits non-zero', async () => {
    mockedExecScript.mockResolvedValue({ stdout: '', stderr: 'denied', code: 1 });

    await expect(killJob(ctx, 'job-1')).rejects.toThrow('Failed to cancel remote command: denied');
  });
});
