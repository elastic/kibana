/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import type { ConnectorCallContext } from './execute_in_connector';
import { execScript, uploadFile } from './execute_in_connector';

export const REMOTE_HOST_JOB_ROOT = '/tmp/wf_remote_host';

export interface RemoteHostJobState {
  jobId: string;
  stdoutOffset: number;
  stderrOffset: number;
}

export interface RemoteHostJobStatus {
  status: 'running' | 'terminated';
  stdout: string;
  stderr: string;
  stdoutOffset: number;
  stderrOffset: number;
  exitCode: number;
  output?: string;
}

interface JobStatusPayload {
  status: 'running' | 'terminated';
  exitCode: number;
  stdout: string;
  stderr: string;
  stdoutOffset: number;
  stderrOffset: number;
  output: string;
}

export const createJobId = (): string => randomUUID();

export const getWorkdir = (jobId: string): string => `${REMOTE_HOST_JOB_ROOT}/${jobId}`;

export const wrapUserScript = (code: string, hasEnv: boolean, cwd?: string): string =>
  `
#!/bin/bash
STEP_OUTPUT="$WORKDIR/output.txt"
touch "$STEP_OUTPUT"
${hasEnv ? '. "$WORKDIR/env.sh"' : ''}
${cwd ? `cd ${JSON.stringify(cwd)} || exit 1` : ''}
export FORCE_COLOR=1 TERM=xterm-256color
${code}
`.trim();

export const parseScriptOutput = (raw: string | undefined): unknown => {
  if (raw === undefined || raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

export const parseJobStatus = (stdout: string): RemoteHostJobStatus => {
  const jsonLine = stdout.trim().split('\n').at(-1);
  if (!jsonLine) {
    throw new Error('Remote job status script returned empty stdout');
  }

  let payload: JobStatusPayload;
  try {
    payload = JSON.parse(jsonLine) as JobStatusPayload;
  } catch {
    throw new Error(`Remote job status script returned invalid JSON: ${jsonLine}`);
  }

  const decode = (value: string): string =>
    value ? Buffer.from(value, 'base64').toString('utf-8') : '';

  const output = decode(payload.output);
  return {
    status: payload.status === 'terminated' ? 'terminated' : 'running',
    stdout: decode(payload.stdout),
    stderr: decode(payload.stderr),
    stdoutOffset: payload.stdoutOffset,
    stderrOffset: payload.stderrOffset,
    exitCode: payload.exitCode,
    output: output === '' ? undefined : output,
  };
};

const BASH_STATUS_HELPERS = `_b64_from() {
  local off="$1" f="$2"
  tail -c +$(( off + 1 )) "$f" 2>/dev/null | base64 -w 0 2>/dev/null \\
    || tail -c +$(( off + 1 )) "$f" 2>/dev/null | openssl base64 -A 2>/dev/null \\
    || echo ''
}
_fsize() { wc -c < "$1" 2>/dev/null | tr -d ' ' || echo '0'; }`;

const printTerminatedStatus = (
  workdir: string,
  stdoutOffset: number,
  stderrOffset: number
): string => {
  const stdoutFile = `${workdir}/stdout.txt`;
  const stderrFile = `${workdir}/stderr.txt`;
  const codeFile = `${workdir}/code.txt`;
  const outputFile = `${workdir}/output.txt`;

  return `EXIT_CODE=$(cat "${codeFile}" 2>/dev/null || echo '0')
STDOUT=$(_b64_from ${stdoutOffset} "${stdoutFile}")
STDERR=$(_b64_from ${stderrOffset} "${stderrFile}")
STDOUT_SIZE=$(_fsize "${stdoutFile}")
STDERR_SIZE=$(_fsize "${stderrFile}")
OUTPUT=''
if [ -f "${outputFile}" ]; then
  OUTPUT=$(_b64_from 0 "${outputFile}")
fi
rm -rf "${workdir}"
printf '{"status":"terminated","exitCode":%s,"stdout":"%s","stderr":"%s","stdoutOffset":%s,"stderrOffset":%s,"output":"%s"}\\n' \\
  "$EXIT_CODE" "$STDOUT" "$STDERR" "$STDOUT_SIZE" "$STDERR_SIZE" "$OUTPUT"`;
};

const printRunningStatus = (
  workdir: string,
  stdoutOffset: number,
  stderrOffset: number
): string => {
  const stdoutFile = `${workdir}/stdout.txt`;
  const stderrFile = `${workdir}/stderr.txt`;

  return `STDOUT=$(_b64_from ${stdoutOffset} "${stdoutFile}")
STDERR=$(_b64_from ${stderrOffset} "${stderrFile}")
STDOUT_SIZE=$(_fsize "${stdoutFile}")
STDERR_SIZE=$(_fsize "${stderrFile}")
printf '{"status":"running","exitCode":0,"stdout":"%s","stderr":"%s","stdoutOffset":%s,"stderrOffset":%s,"output":""}\\n' \\
  "$STDOUT" "$STDERR" "$STDOUT_SIZE" "$STDERR_SIZE"`;
};

const buildLauncherScript = (workdir: string, scriptFile: string): string => {
  const stdoutFile = `${workdir}/stdout.txt`;
  const stderrFile = `${workdir}/stderr.txt`;
  const codeFile = `${workdir}/code.txt`;
  const pidFile = `${workdir}/pid.txt`;

  return `#!/bin/bash
${BASH_STATUS_HELPERS}
mkdir -p "${workdir}"
setsid bash -c 'WORKDIR="${workdir}" bash "${scriptFile}" < /dev/null > "${stdoutFile}" 2>"${stderrFile}"; echo $? > "${codeFile}"' < /dev/null > /dev/null 2>&1 &
PID=$!
echo $PID > "${pidFile}"
TIMEOUT=20
COUNT=0
while [ ! -f "${codeFile}" ] && [ $COUNT -lt $TIMEOUT ]; do
  sleep 0.1
  COUNT=$((COUNT + 1))
done
if [ -f "${codeFile}" ]; then
${printTerminatedStatus(workdir, 0, 0)}
  exit 0
fi
printf '{"status":"running","exitCode":0,"stdout":"","stderr":"","stdoutOffset":0,"stderrOffset":0,"output":""}\\n'
`;
};

const buildStatusScript = (workdir: string, stdoutOffset: number, stderrOffset: number): string => {
  const codeFile = `${workdir}/code.txt`;

  return `#!/bin/bash
${BASH_STATUS_HELPERS}
if [ -f "${codeFile}" ]; then
${printTerminatedStatus(workdir, stdoutOffset, stderrOffset)}
else
${printRunningStatus(workdir, stdoutOffset, stderrOffset)}
fi
`;
};

const buildKillScript = (workdir: string): string => `#!/bin/bash
if [ -f "${workdir}/pid.txt" ]; then
  PID=$(cat "${workdir}/pid.txt")
  kill -9 -$PID 2>/dev/null || kill -9 $PID 2>/dev/null || true
fi
rm -rf "${workdir}"
`;

const envRecordToScript = (env: Record<string, string>): string =>
  Object.entries(env)
    .map(([key, value]) => `export ${key}=${JSON.stringify(value)}`)
    .join('\n');

export async function startJob(
  ctx: ConnectorCallContext,
  script: string,
  env?: Record<string, string>,
  cwd?: string
): Promise<RemoteHostJobStatus & { jobId: string }> {
  const jobId = createJobId();
  const workdir = getWorkdir(jobId);
  const scriptFile = `${workdir}/script.sh`;
  const hasEnv = env != null && Object.keys(env).length > 0;

  if (hasEnv) {
    await uploadFile(ctx, {
      remotePath: `${workdir}/env.sh`,
      content: envRecordToScript(env),
    });
  }

  await uploadFile(ctx, {
    remotePath: scriptFile,
    content: wrapUserScript(script, hasEnv, cwd),
  });

  const { stdout, stderr, code } = await execScript(ctx, buildLauncherScript(workdir, scriptFile));
  if (code !== 0) {
    throw new Error(`Failed to start remote command: ${stderr}`);
  }

  return { ...parseJobStatus(stdout), jobId };
}

export async function pollJob(
  ctx: ConnectorCallContext,
  state: RemoteHostJobState
): Promise<RemoteHostJobStatus> {
  const workdir = getWorkdir(state.jobId);
  const stdoutOffset = Math.max(0, Math.floor(state.stdoutOffset));
  const stderrOffset = Math.max(0, Math.floor(state.stderrOffset));

  const { stdout, stderr, code } = await execScript(
    ctx,
    buildStatusScript(workdir, stdoutOffset, stderrOffset)
  );
  if (code !== 0) {
    throw new Error(`Failed to poll remote command: ${stderr}`);
  }

  return parseJobStatus(stdout);
}

export async function killJob(ctx: ConnectorCallContext, jobId: string): Promise<void> {
  const { stderr, code } = await execScript(ctx, buildKillScript(getWorkdir(jobId)));
  if (code !== 0) {
    throw new Error(`Failed to cancel remote command: ${stderr}`);
  }
}
