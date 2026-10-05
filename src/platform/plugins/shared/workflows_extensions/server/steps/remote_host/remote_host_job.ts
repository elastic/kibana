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

/** Each SSH login gets its own private root, so connectors using different accounts do not collide. */
const REMOTE_HOST_JOB_ROOT_PATTERN = /^\/tmp\/wf_remote_host_\d+$/;
const REMOTE_HOST_JOB_ROOT_EXPRESSION = '/tmp/wf_remote_host_$(id -u)';

/** OpenSSH exits 255 when the client fails. The status script does not. */
const SSH_CLIENT_FAILURE_CODE = 255;

export class RemoteHostUnreachableError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'RemoteHostUnreachableError';
  }
}

interface RemoteHostJobState {
  jobId: string;
  stdoutOffset: number;
  stderrOffset: number;
}

export interface RemoteHostJobStatus {
  status: 'running' | 'terminated' | 'lost';
  stdout: string;
  stderr: string;
  stdoutOffset: number;
  stderrOffset: number;
  exitCode: number;
  output?: string;
  pid?: number;
}

interface JobStatusPayload {
  status: 'running' | 'terminated' | 'lost';
  exitCode: number;
  stdout: string;
  stderr: string;
  stdoutOffset: number;
  stderrOffset: number;
  output: string;
  pid?: number | null;
}

const createJobId = (): string => randomUUID();

/** Shell expression for the job directory. Expands inside double quotes on the remote host. */
export const getWorkdir = (jobId: string): string => `${REMOTE_HOST_JOB_ROOT_EXPRESSION}/${jobId}`;

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

export const wrapUserScript = (code: string, hasEnv: boolean, cwd?: string): string =>
  `
#!/bin/bash
export STEP_OUTPUT="$WORKDIR/output.txt"
touch "$STEP_OUTPUT"
${hasEnv ? '. "$WORKDIR/env.sh"' : ''}
${cwd ? `cd ${shellQuote(cwd)} || exit 1` : ''}
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
  const status =
    payload.status === 'terminated' || payload.status === 'lost' ? payload.status : 'running';
  const pid =
    typeof payload.pid === 'number' && Number.isFinite(payload.pid) && payload.pid > 0
      ? payload.pid
      : undefined;

  return {
    status,
    stdout: decode(payload.stdout),
    stderr: decode(payload.stderr),
    stdoutOffset: payload.stdoutOffset,
    stderrOffset: payload.stderrOffset,
    exitCode: payload.exitCode,
    output: output === '' ? undefined : output,
    ...(pid != null ? { pid } : {}),
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
  stderrOffset: number,
  maxBytes: number
): string => {
  const stdoutFile = `${workdir}/stdout.txt`;
  const stderrFile = `${workdir}/stderr.txt`;
  const codeFile = `${workdir}/code.txt`;
  const outputFile = `${workdir}/output.txt`;
  const sizeGuard =
    maxBytes > 0
      ? `OUTPUT_SIZE=$(_fsize "${outputFile}")
  if [ "$OUTPUT_SIZE" -gt ${maxBytes} ]; then
    echo "STEP_OUTPUT exceeds max-step-size ($OUTPUT_SIZE bytes > ${maxBytes} bytes)" >&2
    rm -rf "${workdir}"
    exit 2
  fi
  `
      : '';

  return `EXIT_CODE=$(cat "${codeFile}" 2>/dev/null || echo '0')
STDOUT=$(_b64_from ${stdoutOffset} "${stdoutFile}")
STDERR=$(_b64_from ${stderrOffset} "${stderrFile}")
STDOUT_SIZE=$(_fsize "${stdoutFile}")
STDERR_SIZE=$(_fsize "${stderrFile}")
OUTPUT=''
if [ -f "${outputFile}" ]; then
  ${sizeGuard}OUTPUT=$(_b64_from 0 "${outputFile}")
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

const printLostStatus = (workdir: string, stdoutOffset: number, stderrOffset: number): string => {
  const stdoutFile = `${workdir}/stdout.txt`;
  const stderrFile = `${workdir}/stderr.txt`;

  return `STDOUT=$(_b64_from ${stdoutOffset} "${stdoutFile}")
STDERR=$(_b64_from ${stderrOffset} "${stderrFile}")
STDOUT_SIZE=$(_fsize "${stdoutFile}")
STDERR_SIZE=$(_fsize "${stderrFile}")
case "$PID" in
  ''|*[!0-9]*) LOST_PID=null ;;
  *) LOST_PID=$PID ;;
esac
if [ "$LOST_PID" != null ]; then
  kill -9 -"$LOST_PID" 2>/dev/null || true
fi
rm -rf "${workdir}"
printf '{"status":"lost","exitCode":0,"pid":%s,"stdout":"%s","stderr":"%s","stdoutOffset":%s,"stderrOffset":%s,"output":""}\\n' \\
  "$LOST_PID" "$STDOUT" "$STDERR" "$STDOUT_SIZE" "$STDERR_SIZE"`;
};

/** PID still alive reports running. A gone PID reads code.txt: present is a normal exit, missing is lost. */
const buildStatusDecision = (
  workdir: string,
  stdoutOffset: number,
  stderrOffset: number,
  maxBytes: number
): string => {
  const pidFile = `${workdir}/pid.txt`;
  const codeFile = `${workdir}/code.txt`;

  return `PID=$(cat "${pidFile}" 2>/dev/null || echo '')
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
${printRunningStatus(workdir, stdoutOffset, stderrOffset)}
elif [ -f "${codeFile}" ]; then
${printTerminatedStatus(workdir, stdoutOffset, stderrOffset, maxBytes)}
else
${printLostStatus(workdir, stdoutOffset, stderrOffset)}
fi`;
};

const buildLauncherScript = (workdir: string, scriptFile: string, maxBytes: number): string => {
  const stdoutFile = `${workdir}/stdout.txt`;
  const stderrFile = `${workdir}/stderr.txt`;
  const codeFile = `${workdir}/code.txt`;
  const pidFile = `${workdir}/pid.txt`;
  // $$ is the wrapper that writes code.txt. $! is the setsid parent, which exits when setsid forks.
  const jobCmd = `echo $$ > "${pidFile}"; WORKDIR="${workdir}" bash "${scriptFile}" < /dev/null > "${stdoutFile}" 2>"${stderrFile}"; echo $? > "${codeFile}"`;

  return `#!/bin/bash
${BASH_STATUS_HELPERS}
set -m
if command -v setsid >/dev/null 2>&1; then
  setsid bash -c '${jobCmd}' < /dev/null > /dev/null 2>&1 &
else
  bash -c '${jobCmd}' < /dev/null > /dev/null 2>&1 &
fi
TIMEOUT=20
COUNT=0
while [ $COUNT -lt $TIMEOUT ]; do
  if [ -f "${pidFile}" ]; then
    PID=$(cat "${pidFile}")
    if [ -n "$PID" ] && ! kill -0 "$PID" 2>/dev/null; then
      break
    fi
  fi
  sleep 0.1
  COUNT=$((COUNT + 1))
done
${buildStatusDecision(workdir, 0, 0, maxBytes)}
`;
};

const buildStatusScript = (
  workdir: string,
  stdoutOffset: number,
  stderrOffset: number,
  maxBytes: number
): string => {
  return `#!/bin/bash
${BASH_STATUS_HELPERS}
${buildStatusDecision(workdir, stdoutOffset, stderrOffset, maxBytes)}
`;
};

const buildKillScript = (workdir: string): string => `#!/bin/bash
if [ -f "${workdir}/pid.txt" ]; then
  PID=$(cat "${workdir}/pid.txt")
  kill -9 -$PID 2>/dev/null || kill -9 $PID 2>/dev/null || true
fi
rm -rf "${workdir}"
`;

const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const createVariableAssignment = (variable: string, value: string): string => {
  if (!ENV_KEY_PATTERN.test(variable)) {
    throw new Error(`Invalid environment variable name: ${variable}`);
  }

  // Base64 keeps the value as data. The trailing "x" preserves trailing newlines through $(...).
  const encoded = Buffer.from(value, 'utf-8').toString('base64');
  return `export ${variable}
${variable}=$(printf '%s' '${encoded}' | base64 -d; echo x)
${variable}=\${${variable}%x}`;
};

const buildPrepareScript = (jobId: string): string => `#!/bin/bash
umask 077
ROOT="${REMOTE_HOST_JOB_ROOT_EXPRESSION}"
mkdir -p -m 700 "$ROOT" || exit 1
if [ -L "$ROOT" ] || [ ! -O "$ROOT" ]; then
  echo "Unsafe job root $ROOT" >&2
  exit 1
fi
chmod 700 "$ROOT" || exit 1
mkdir -m 700 "$ROOT/${jobId}" || exit 1
printf '%s\\n' "$ROOT"
`;

const prepareWorkdir = async (ctx: ConnectorCallContext, jobId: string): Promise<string> => {
  const { stdout, stderr, code } = await execScript(ctx, buildPrepareScript(jobId));
  if (code !== 0) {
    throw new Error(`Failed to prepare remote job directory: ${stderr}`);
  }

  const root = stdout.trim().split('\n').at(-1) ?? '';
  if (!REMOTE_HOST_JOB_ROOT_PATTERN.test(root)) {
    throw new Error(`Remote job directory has an unexpected path: ${root}`);
  }
  return `${root}/${jobId}`;
};

const envRecordToScript = (env: Record<string, string>): string =>
  Object.entries(env)
    .map(([key, value]) => createVariableAssignment(key, value))
    .join('\n');

export async function startJob(
  ctx: ConnectorCallContext,
  script: string,
  env?: Record<string, string>,
  cwd?: string,
  maxBytes = 0
): Promise<RemoteHostJobStatus & { jobId: string }> {
  const jobId = createJobId();
  const hasEnv = env != null && Object.keys(env).length > 0;
  const outputLimit = Math.max(0, Math.floor(maxBytes));
  const envScript = hasEnv ? envRecordToScript(env) : undefined;

  // The private (0700) job directory is created first, so uploaded files are never exposed.
  const workdir = await prepareWorkdir(ctx, jobId);
  const scriptFile = `${workdir}/script.sh`;

  try {
    if (envScript !== undefined) {
      await uploadFile(ctx, { remotePath: `${workdir}/env.sh`, content: envScript });
    }

    await uploadFile(ctx, {
      remotePath: scriptFile,
      content: wrapUserScript(script, hasEnv, cwd),
    });

    const { stdout, stderr, code } = await execScript(
      ctx,
      buildLauncherScript(workdir, scriptFile, outputLimit)
    );
    if (code !== 0) {
      throw new Error(`Failed to start remote command: ${stderr}`);
    }

    return { ...parseJobStatus(stdout), jobId };
  } catch (error) {
    // Best effort: do not leave env.sh and script.sh behind when the job never started.
    await killJob(ctx, jobId).catch(() => undefined);
    throw error;
  }
}

export async function pollJob(
  ctx: ConnectorCallContext,
  state: RemoteHostJobState,
  maxBytes = 0
): Promise<RemoteHostJobStatus> {
  const workdir = getWorkdir(state.jobId);
  const stdoutOffset = Math.max(0, Math.floor(state.stdoutOffset));
  const stderrOffset = Math.max(0, Math.floor(state.stderrOffset));
  const outputLimit = Math.max(0, Math.floor(maxBytes));

  const { stdout, stderr, code } = await execScript(
    ctx,
    buildStatusScript(workdir, stdoutOffset, stderrOffset, outputLimit)
  );
  if (code === SSH_CLIENT_FAILURE_CODE) {
    throw new RemoteHostUnreachableError(stderr || 'SSH connection failed');
  }
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
