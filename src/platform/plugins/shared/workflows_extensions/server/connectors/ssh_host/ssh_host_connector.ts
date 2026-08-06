/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { exec } from 'child_process';
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type {
  SshHostConfig,
  SshHostDownloadFileParams,
  SshHostExecAsyncParams,
  SshHostExecFileAsyncParams,
  SshHostExecParams,
  SshHostGetExecStatusParams,
  SshHostKillExecParams,
  SshHostSecrets,
  SshHostUploadFileParams,
} from './schemas';
import {
  SshHostDownloadFileParamsSchema,
  SshHostExecAsyncParamsSchema,
  SshHostExecFileAsyncParamsSchema,
  SshHostExecParamsSchema,
  SshHostGetExecStatusParamsSchema,
  SshHostKillExecParamsSchema,
  SshHostUploadFileParamsSchema,
} from './schemas';

const execPromise = promisify(exec);

export const SSH_HOST_TEMP_DIR = '/tmp/ssh_host_connector';

const DEFAULT_SSH_PORT = 22;

const parseHost = (host: string): { hostname: string; port: number } => {
  const lastColon = host.lastIndexOf(':');
  if (lastColon === -1) return { hostname: host, port: DEFAULT_SSH_PORT };
  const portStr = host.slice(lastColon + 1);
  const port = parseInt(portStr, 10);
  if (!portStr || isNaN(port) || port < 1 || port > 65535) {
    return { hostname: host, port: DEFAULT_SSH_PORT };
  }
  return { hostname: host.slice(0, lastColon), port };
};

export class SshHostConnector extends SubActionConnector<SshHostConfig, SshHostSecrets> {
  constructor(params: ServiceParams<SshHostConfig, SshHostSecrets>) {
    super(params);

    this.registerSubAction({
      name: 'exec',
      method: 'exec',
      schema: SshHostExecParamsSchema,
    });

    this.registerSubAction({
      name: 'execAsync',
      method: 'execAsync',
      schema: SshHostExecAsyncParamsSchema,
    });

    this.registerSubAction({
      name: 'getExecStatus',
      method: 'getExecStatus',
      schema: SshHostGetExecStatusParamsSchema,
    });

    this.registerSubAction({
      name: 'downloadFile',
      method: 'downloadFile',
      schema: SshHostDownloadFileParamsSchema,
    });

    this.registerSubAction({
      name: 'uploadFile',
      method: 'uploadFile',
      schema: SshHostUploadFileParamsSchema,
    });

    this.registerSubAction({
      name: 'execFileAsync',
      method: 'execFileAsync',
      schema: SshHostExecFileAsyncParamsSchema,
    });

    this.registerSubAction({
      name: 'killExec',
      method: 'killExec',
      schema: SshHostKillExecParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: Error & { response?: { data?: unknown } }): string {
    return (error.response?.data as { message?: string })?.message ?? error.message;
  }

  public async exec(
    params: SshHostExecParams
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    return this.execCommand(params);
  }

  public async execAsync(params: SshHostExecAsyncParams): Promise<{
    commandId: string;
    status: 'DONE' | 'RUNNING';
    stderr?: string;
    stdout?: string;
    exitCode?: number;
    files?: Array<{ file: string; content: string }>;
  }> {
    const commandId = `bash_${new Date().toISOString()}`;
    const { tmpDir, stdoutFile, stderrFile, codeFile, scriptFile } = this.getCommandData(commandId);

    const wrappedScript = `#!/bin/bash
SCRIPT_OUTPUT=''
_capture_output() {
  if [ -n "$SCRIPT_OUTPUT" ]; then
    printf '%s' "$SCRIPT_OUTPUT" > "$COMMAND_TMP_DIR/output.txt"
  fi
}
trap '_capture_output' EXIT

${params.script}`;

    await this.uploadFile({
      remotePath: scriptFile,
      content: Buffer.from(wrappedScript).toString('base64'),
      encoding: 'base64',
    });

    const command = `#!/bin/bash
(COMMAND_TMP_DIR="${tmpDir}" bash "${scriptFile}" < /dev/null > "${stdoutFile}" 2>"${stderrFile}"; echo $? > "${codeFile}") </dev/null >/dev/null 2>&1 &
PID=$!
echo $PID > "${tmpDir}/pid.txt"
TIMEOUT=20
COUNT=0
while [ ! -f "${codeFile}" ] && [ $COUNT -lt $TIMEOUT ]; do
  sleep 0.1
  COUNT=$((COUNT + 1))
done
if [ -f "${codeFile}" ]; then
  EXIT_CODE=$(cat "${codeFile}" 2>/dev/null || echo '0')
  _b64() { base64 -w 0 "$1" 2>/dev/null || openssl base64 -A "$1" 2>/dev/null || echo ''; }
  STDOUT=$(_b64 "${stdoutFile}")
  STDERR=$(_b64 "${stderrFile}")
  echo "STATUS=DONE"
  echo "EXIT_CODE=$EXIT_CODE"
  echo "STDOUT=$STDOUT"
  echo "STDERR=$STDERR"
  FILES_LIST=""
  for _f in "${tmpDir}"/*; do
    [ -f "$_f" ] || continue
    _fname=$(basename "$_f")
    case "$_fname" in
      script.sh|stdout.txt|stderr.txt|code.txt) continue ;;
    esac
    [ -n "$FILES_LIST" ] && FILES_LIST="$FILES_LIST,"
    FILES_LIST="$FILES_LIST$_fname"
    _key=$(echo "$_fname" | sed 's/[^a-zA-Z0-9]/_/g')
    echo "FILE_\${_key}=$(_b64 "$_f")"
  done
  echo "FILES=$FILES_LIST"
  rm -rf "${tmpDir}"
  exit 0
fi
echo "STATUS=RUNNING"
`;

    const { stdout, stderr, code } = await this.execCommand({
      script: command,
      signal: params.signal,
    });

    if (code !== 0) {
      throw new Error(`Failed to execute async command: ${stderr}`);
    }

    const status = stdout.match(/^STATUS=(DONE|RUNNING)$/m)?.[1] ?? 'RUNNING';
    const exitCode = parseInt(stdout.match(/^EXIT_CODE=(\d+)$/m)?.[1] ?? '0', 10);
    const stdoutB64 = stdout.match(/^STDOUT=(.*)$/m)?.[1] ?? '';
    const stderrB64 = stdout.match(/^STDERR=(.*)$/m)?.[1] ?? '';
    const fileNames = (stdout.match(/^FILES=(.*)$/m)?.[1] ?? '').split(',').filter(Boolean);
    const files = fileNames.map((name) => {
      const key = name.replace(/[^a-zA-Z0-9]/g, '_');
      const b64 = stdout.match(new RegExp(`^FILE_${key}=(.*)$`, 'm'))?.[1] ?? '';
      return { file: name, content: Buffer.from(b64, 'base64').toString('utf-8') };
    });

    return {
      commandId,
      status: status === 'DONE' ? 'DONE' : 'RUNNING',
      exitCode,
      stdout: Buffer.from(stdoutB64, 'base64').toString('utf-8').trim(),
      stderr: Buffer.from(stderrB64, 'base64').toString('utf-8').trim(),
      files: files.length > 0 ? files : undefined,
    };
  }

  public async execFileAsync(
    params: SshHostExecFileAsyncParams
  ): ReturnType<typeof this.execAsync> {
    const { executable, args, env = {}, cwd, outputFiles, signal } = params;

    const b64 = (s: string) => Buffer.from(s).toString('base64');
    const dec = (b: string) => `"$(printf '%s' '${b}' | openssl base64 -d -A)"`;

    const envLines = Object.entries(env)
      .map(([k, v]) => `export ${k}=${dec(b64(String(v)))}`)
      .join('\n');
    const cdLine = cwd ? `cd ${dec(b64(cwd))}` : '';
    const invocation = [executable, ...args].map((a) => dec(b64(a))).join(' ');
    const collectLines = (outputFiles ?? [])
      .map((f) => `cp ${dec(b64(f))} "$COMMAND_TMP_DIR/$(basename ${dec(b64(f))})"`)
      .join('\n');

    const script = ['#!/bin/bash', 'set -e', envLines, cdLine, invocation, collectLines]
      .filter(Boolean)
      .join('\n');

    return this.execAsync({ script, signal });
  }

  public async getExecStatus(params: SshHostGetExecStatusParams): Promise<{
    commandId: string;
    status: 'DONE' | 'RUNNING';
    stderr?: string;
    stdout?: string;
    exitCode?: number;
    files?: Array<{ file: string; content: string }>;
  }> {
    const { commandId, signal } = params;
    const { tmpDir, stdoutFile, stderrFile, codeFile } = this.getCommandData(commandId);

    const command = `#!/bin/bash
_b64() { base64 -w 0 "$1" 2>/dev/null || openssl base64 -A "$1" 2>/dev/null || echo ''; }
if [ -f "${codeFile}" ]; then
  EXIT_CODE=$(cat "${codeFile}" 2>/dev/null || echo '0')
  STDOUT=$(_b64 "${stdoutFile}")
  STDERR=$(_b64 "${stderrFile}")
  echo "STATUS=DONE"
  echo "EXIT_CODE=$EXIT_CODE"
  echo "STDOUT=$STDOUT"
  echo "STDERR=$STDERR"
  FILES_LIST=""
  for _f in "${tmpDir}"/*; do
    [ -f "$_f" ] || continue
    _fname=$(basename "$_f")
    case "$_fname" in
      script.sh|stdout.txt|stderr.txt|code.txt) continue ;;
    esac
    [ -n "$FILES_LIST" ] && FILES_LIST="$FILES_LIST,"
    FILES_LIST="$FILES_LIST$_fname"
    _key=$(echo "$_fname" | sed 's/[^a-zA-Z0-9]/_/g')
    echo "FILE_\${_key}=$(_b64 "$_f")"
  done
  echo "FILES=$FILES_LIST"
  rm -rf "${tmpDir}"
else
  STDOUT=$(_b64 "${stdoutFile}")
  STDERR=$(_b64 "${stderrFile}")
  echo "STATUS=RUNNING"
  echo "STDOUT=$STDOUT"
  echo "STDERR=$STDERR"
fi`;

    const { stdout } = await this.execCommand({ script: command, signal });
    const status = stdout.match(/^STATUS=(DONE|RUNNING)$/m)?.[1] ?? 'RUNNING';
    const exitCode = parseInt(stdout.match(/^EXIT_CODE=(\d+)$/m)?.[1] ?? '0', 10);
    const stdoutB64 = stdout.match(/^STDOUT=(.*)$/m)?.[1] ?? '';
    const stderrB64 = stdout.match(/^STDERR=(.*)$/m)?.[1] ?? '';
    const fileNames = (stdout.match(/^FILES=(.*)$/m)?.[1] ?? '').split(',').filter(Boolean);
    const files = fileNames.map((name) => {
      const key = name.replace(/[^a-zA-Z0-9]/g, '_');
      const b64 = stdout.match(new RegExp(`^FILE_${key}=(.*)$`, 'm'))?.[1] ?? '';
      return { file: name, content: Buffer.from(b64, 'base64').toString('utf-8') };
    });

    return {
      commandId,
      status: status === 'DONE' ? 'DONE' : 'RUNNING',
      exitCode,
      stdout: Buffer.from(stdoutB64, 'base64').toString('utf-8').trim(),
      stderr: Buffer.from(stderrB64, 'base64').toString('utf-8').trim(),
      files: files.length > 0 ? files : undefined,
    };
  }

  public async killExec(params: SshHostKillExecParams): Promise<void> {
    const { commandId } = params;
    const { tmpDir } = this.getCommandData(commandId);
    const killScript = `
TMP_DIR="${tmpDir}"
if [ -f "$TMP_DIR/pid.txt" ]; then
  PID=$(cat "$TMP_DIR/pid.txt");
  kill -9 $PID 2>/dev/null || true;
fi
rm -rf "$TMP_DIR"
`;
    await this.execCommand({ script: killScript });
  }

  public async downloadFile(
    params: SshHostDownloadFileParams
  ): Promise<{ content: string; encoding: 'base64' }> {
    const { remotePath } = params;
    const { hostname, port } = parseHost(this.config.host);
    const { username, password, sshPrivateKey } = this.secrets;
    const tempKeyPath = join(
      tmpdir(),
      `ssh_host_key_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    const tempDownloadPath = join(tmpdir(), `ssh_host_download_${Date.now()}`);

    try {
      const keyContent = `${sshPrivateKey.replace(/\r/g, '').trimEnd()}\n`;
      const fd = openSync(tempKeyPath, 'w', 0o600);
      writeSync(fd, keyContent);
      closeSync(fd);

      const controlPath = this.getControlPath();
      const scpOpts = [
        `-i "${tempKeyPath}"`,
        '-o StrictHostKeyChecking=no',
        '-o UserKnownHostsFile=/dev/null',
        '-o ConnectTimeout=10',
        '-o ControlMaster=auto',
        `-o ControlPath="${controlPath}"`,
        '-o ControlPersist=60s',
        `-P ${port}`,
      ];

      let command: string;
      let env: NodeJS.ProcessEnv;

      if (password) {
        scpOpts.push('-o PasswordAuthentication=yes');
        command = `sshpass -e scp ${scpOpts.join(
          ' '
        )} ${username}@${hostname}:"${remotePath}" "${tempDownloadPath}"`;
        env = { ...process.env, SSHPASS: password };
      } else {
        scpOpts.push('-o PasswordAuthentication=no');
        command = `scp ${scpOpts.join(
          ' '
        )} ${username}@${hostname}:"${remotePath}" "${tempDownloadPath}"`;
        env = process.env;
      }

      await execPromise(command, { env });

      const content = readFileSync(tempDownloadPath).toString('base64');
      return { content, encoding: 'base64' };
    } finally {
      if (existsSync(tempKeyPath)) {
        unlinkSync(tempKeyPath);
      }
      if (existsSync(tempDownloadPath)) {
        unlinkSync(tempDownloadPath);
      }
    }
  }

  public async uploadFile(params: SshHostUploadFileParams): Promise<void> {
    const { remotePath, content } = params;
    const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
    const mkdirPart = remoteDir ? `mkdir -p "${remoteDir}" && ` : '';
    const { code, stderr } = await this.execCommand({
      script: `${mkdirPart}printf '%s' '${content}' | openssl base64 -d -A > "${remotePath}"`,
      signal: params.signal,
    });
    if (code !== 0) {
      throw new Error(`Failed to upload file to ${remotePath}: ${stderr}`);
    }
  }

  private async execCommand(
    params: SshHostExecParams
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    const { script, signal } = params;
    const { hostname, port } = parseHost(this.config.host);
    const { username, password, sshPrivateKey } = this.secrets;
    const tempKeyPath = join(
      tmpdir(),
      `ssh_host_key_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );

    try {
      // Strip \r so CRLF-pasted keys don't corrupt OpenSSH parsing; ensure trailing newline.
      const keyContent = `${sshPrivateKey.replace(/\r/g, '').trimEnd()}\n`;

      // Write private key with restricted permissions (writeFileSync is ESLint-restricted)
      const fd = openSync(tempKeyPath, 'w', 0o600);
      writeSync(fd, keyContent);
      closeSync(fd);

      // Base64-encode the script so bash variables ($PID, $STATE, etc.) are not expanded
      // by the local shell when it processes the double-quoted SSH argument.
      const encodedScript = Buffer.from(script).toString('base64');
      const remoteCmd = `printf '%s' '${encodedScript}' | openssl base64 -d -A | bash`;

      const controlPath = this.getControlPath();
      const sshOpts = [
        `-i "${tempKeyPath}"`,
        '-o StrictHostKeyChecking=no',
        '-o UserKnownHostsFile=/dev/null',
        '-o ConnectTimeout=10',
        '-o ControlMaster=auto',
        `-o ControlPath="${controlPath}"`,
        '-o ControlPersist=60s',
        `-p ${port}`,
      ];

      let command: string;
      let env: NodeJS.ProcessEnv;

      if (password) {
        // Pass password via SSHPASS env var — safer than -p flag which is visible in ps
        // sshpass -e uses the SSHPASS variable; -o PasswordAuthentication=yes allows fallback
        sshOpts.push('-o PasswordAuthentication=yes');
        command = `sshpass -e ssh ${sshOpts.join(' ')} ${username}@${hostname} "${remoteCmd}"`;
        env = { ...process.env, SSHPASS: password };
      } else {
        sshOpts.push('-o PasswordAuthentication=no');
        command = `ssh ${sshOpts.join(' ')} ${username}@${hostname} "${remoteCmd}"`;
        env = process.env;
      }

      const { stdout, stderr } = await execPromise(command, {
        env,
        signal,
        maxBuffer: 100 * 1024 * 1024,
      });

      const sanitizedStdout = stdout.replace(command, '').trim();
      const sanitizedStderr = stderr.replace(command, '').trim();

      return { stdout: sanitizedStdout, stderr: sanitizedStderr, code: 0 };
    } catch (error) {
      const ischildProcessError =
        error instanceof Error && 'stdout' in error && 'stderr' in error && 'code' in error;

      if (
        ischildProcessError &&
        typeof error.stdout === 'string' &&
        typeof error.stderr === 'string' &&
        typeof error.code === 'number'
      ) {
        return {
          stdout: error.stdout.trim(),
          stderr: error.stderr.trim(),
          code: error.code,
        };
      }

      throw error;
    } finally {
      if (existsSync(tempKeyPath)) {
        unlinkSync(tempKeyPath);
      }
    }
  }

  private getControlPath(): string {
    const { hostname, port } = parseHost(this.config.host);
    const { username } = this.secrets;
    const safeId = `${username}_${hostname}_${port}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(tmpdir(), `kbn_cm_${safeId}`);
  }

  private getCommandData(commandId: string) {
    const tmpDir = `${SSH_HOST_TEMP_DIR}/${commandId}`;

    return {
      tmpDir,
      scriptFile: `${tmpDir}/script.sh`,
      stdoutFile: `${tmpDir}/stdout.txt`,
      stderrFile: `${tmpDir}/stderr.txt`,
      codeFile: `${tmpDir}/code.txt`,
    };
  }
}
