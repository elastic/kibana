/**
 * Docker reference adapter. Supports the full interface including
 * snapshot/resume (via `docker commit`), which makes it the local test bed for
 * --mode warm. Default image is buildpack-deps:bookworm (git + curl included).
 */

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

let settings = { image: 'buildpack-deps:bookworm' };

export const capabilities = { snapshot: true };

export async function init(providerConfig) {
  settings = { ...settings, ...providerConfig };
}

const docker = (dockerArgs, { stdin, timeoutMs } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn('docker', dockerArgs);
    let stdout = '';
    let stderr = '';
    const timer = timeoutMs ? setTimeout(() => child.kill('SIGKILL'), timeoutMs) : null;
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ exitCode: code ?? 124, stdout, stderr });
    });
    if (stdin !== undefined) child.stdin.end(stdin);
    else child.stdin.end();
  });

const runContainer = async (image, spec) => {
  const args = ['run', '-d', '--label', 'kbn-sandbox-bench'];
  if (spec?.cpus) args.push('--cpus', String(spec.cpus));
  if (spec?.memGb) args.push('--memory', `${spec.memGb}g`);
  args.push(image, 'sleep', 'infinity');
  const res = await docker(args);
  if (res.exitCode !== 0) throw new Error(`docker run failed: ${res.stderr}`);
  return { id: res.stdout.trim(), spec };
};

export async function create(spec) {
  return runContainer(settings.image, spec);
}

export async function exec(handle, script, { timeoutMs }) {
  return docker(['exec', '-i', handle.id, 'bash', '-s'], { stdin: script, timeoutMs });
}

export async function snapshot(handle) {
  const tag = `kbn-sandbox-bench-snap:${randomBytes(6).toString('hex')}`;
  const res = await docker(['commit', handle.id, tag]);
  if (res.exitCode !== 0) throw new Error(`docker commit failed: ${res.stderr}`);
  return { tag, spec: handle.spec };
}

export async function resume(snapId) {
  // Note: `docker commit` restores the filesystem, not running processes —
  // a resumed stack still needs its probe to restart/await services. True
  // memory snapshotting (Firecracker/CRIU-based providers) is exactly what L6
  // is designed to differentiate.
  return runContainer(snapId.tag, snapId.spec);
}

export async function destroy(handle) {
  await docker(['rm', '-f', handle.id]);
}
