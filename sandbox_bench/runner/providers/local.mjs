/**
 * Host-exec adapter with NO isolation. Only for developing the harness itself:
 * each "sandbox" is a temp directory used as HOME/KIBANA_DIR parent.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

export const capabilities = { snapshot: false };

export async function create() {
  const dir = mkdtempSync(join(tmpdir(), 'kbn-sandbox-bench-'));
  return { dir };
}

export async function exec(handle, script, { timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-s'], {
      env: { ...process.env, KIBANA_DIR: join(handle.dir, 'kibana') },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 124, stdout, stderr });
    });
    child.stdin.end(script);
  });
}

export async function destroy(handle) {
  rmSync(handle.dir, { recursive: true, force: true });
}
