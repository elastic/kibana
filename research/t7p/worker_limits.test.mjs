import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { readLimits, appliesTo, workerThreadIds, withoutOldSpaceFlag, withoutOldSpaceEnv } = require('./worker_limits.cjs');
const here = path.dirname(fileURLToPath(import.meta.url));
const probe = path.join(here, 'worker_bootstrap_probe.js');
const preload = path.join(here, 'worker_limits.cjs');

test('readLimits keeps only positive integer caps', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 't7p-limits-'));
  const file = path.join(dir, 'limits.json');
  writeFileSync(file, JSON.stringify({ maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 'nope' }));
  assert.deepEqual(readLimits({ T7P_WORKER_LIMITS_FILE: file }), { maxOldGenerationSizeMb: 256 });
  writeFileSync(file, '{}');
  assert.deepEqual(readLimits({ T7P_WORKER_LIMITS_FILE: file }), {});
  rmSync(dir, { recursive: true, force: true });
});

test('applies only to the capability-kit bootstrap entry', () => {
  assert.equal(appliesTo('/plugins/capability_kit/worker_bootstrap.js'), true);
  assert.equal(appliesTo('/other/pdf_worker.js'), false);
  assert.equal(workerThreadIds.has('worker_threads'), true);
  assert.equal(workerThreadIds.has('node:worker_threads'), true);
  assert.equal(workerThreadIds.has('worker_threads/extra'), false);
});

const heapLimit = (filename, limitsFile, parentFlag) => {
  const script = `
    const { Worker } = require('worker_threads');
    const worker = new Worker(${JSON.stringify(filename)});
    worker.on('message', (message) => {
      process.stdout.write(String(message.heapSizeLimit));
      worker.terminate();
    });
    worker.on('error', (error) => {
      process.stderr.write(String(error));
      process.exit(1);
    });
  `;
  const args = parentFlag
    ? ['--max-old-space-size=2048', '--require', preload, '-e', script]
    : ['--require', preload, '-e', script];
  const result = spawnSync(process.execPath, args, {
    env: {
      ...process.env,
      NODE_OPTIONS: parentFlag ? '--max-old-space-size=2048' : '',
      T7P_WORKER_LIMITS_FILE: limitsFile,
    },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return Number(result.stdout);
};

test('strips the parent old-space flag that would override resourceLimits', () => {
  assert.deepEqual(withoutOldSpaceFlag(['--max-old-space-size=1638', '--no-warnings']), ['--no-warnings']);
  assert.equal(
    withoutOldSpaceEnv({ NODE_OPTIONS: '--no-warnings --max-old-space-size=1638', PATH: 'x' }).NODE_OPTIONS,
    '--no-warnings'
  );
});

test('a 128 MiB cap binds the bootstrap worker and leaves other workers alone', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 't7p-cap-'));
  const limitsFile = path.join(dir, 'limits.json');
  const capped = path.join(dir, 'worker_bootstrap_probe.js');
  const plain = path.join(dir, 'plain_probe.js');
  copyFileSync(probe, capped);
  copyFileSync(probe, plain);
  writeFileSync(limitsFile, JSON.stringify({ maxOldGenerationSizeMb: 128 }));
  const cappedHeap = heapLimit(capped, limitsFile, false);
  const plainHeap = heapLimit(plain, limitsFile, false);
  // Node 24 heap_size_limit is the old-space cap plus a fixed ~192 MiB of other spaces.
  assert.ok(cappedHeap < 400 * 1024 * 1024, `capped heap ${cappedHeap}`);
  assert.ok(cappedHeap > 200 * 1024 * 1024, `capped heap ${cappedHeap}`);
  assert.ok(plainHeap > cappedHeap, `plain ${plainHeap} capped ${cappedHeap}`);
  rmSync(dir, { recursive: true, force: true });
});

test('a parent --max-old-space-size overrides Worker resourceLimits on Node 24', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 't7p-cap-'));
  const limitsFile = path.join(dir, 'limits.json');
  const capped = path.join(dir, 'worker_bootstrap_probe.js');
  copyFileSync(probe, capped);
  writeFileSync(limitsFile, JSON.stringify({ maxOldGenerationSizeMb: 128 }));
  const heap = heapLimit(capped, limitsFile, true);
  assert.ok(heap > 1024 * 1024 * 1024, `expected the parent flag to win, heap ${heap}`);
  rmSync(dir, { recursive: true, force: true });
});

test('worker execArgv cannot set --max-old-space-size on Node 24', () => {
  const script = `
    const { Worker } = require('worker_threads');
    try {
      new Worker(${JSON.stringify(probe)}, { execArgv: ['--max-old-space-size=256'] });
      process.stdout.write('constructed');
    } catch (error) {
      process.stdout.write(String(error.code || error.message));
    }
  `;
  const result = spawnSync(process.execPath, ['--max-old-space-size=2048', '-e', script], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ERR_WORKER_INVALID_EXEC_ARGV/);
});

test('a different worker NODE_OPTIONS old-space flag does not beat the parent flag', () => {
  const script = `
    const { Worker } = require('worker_threads');
    const env = { ...process.env, NODE_OPTIONS: '--max-old-space-size=256' };
    const worker = new Worker(${JSON.stringify(probe)}, {
      env,
      resourceLimits: { maxOldGenerationSizeMb: 128 },
    });
    worker.on('message', (message) => {
      process.stdout.write(String(message.heapSizeLimit));
      worker.terminate();
    });
    worker.on('error', (error) => {
      process.stderr.write(String(error));
      process.exit(1);
    });
  `;
  const result = spawnSync(process.execPath, ['--max-old-space-size=2048', '-e', script], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const heap = Number(result.stdout);
  assert.ok(heap > 1024 * 1024 * 1024, `worker env flag did not lose to the parent, heap ${heap}`);
});

test('setFlagsFromString changes the next isolate and leaves the parent heap configured', () => {
  const script = `
    const v8 = require('v8');
    const { Worker } = require('worker_threads');
    const parentBefore = v8.getHeapStatistics().heap_size_limit;
    v8.setFlagsFromString('--max-old-space-size=256');
    const parentAfter = v8.getHeapStatistics().heap_size_limit;
    const worker = new Worker(${JSON.stringify(probe)});
    worker.on('message', (message) => {
      process.stdout.write(JSON.stringify({
        parentBefore,
        parentAfter,
        worker: message.heapSizeLimit,
      }));
      worker.terminate();
    });
    worker.on('error', (error) => {
      process.stderr.write(String(error));
      process.exit(1);
    });
  `;
  const result = spawnSync(process.execPath, ['--max-old-space-size=2048', '-e', script], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.ok(parsed.parentBefore > 1024 * 1024 * 1024, `parent before ${parsed.parentBefore}`);
  assert.equal(parsed.parentAfter, parsed.parentBefore);
  assert.ok(parsed.worker < 600 * 1024 * 1024, `next isolate was not recapped ${parsed.worker}`);
  assert.ok(parsed.worker > 300 * 1024 * 1024, `next isolate cap too small ${parsed.worker}`);
});

test('a child process argv cap wins over a larger NODE_OPTIONS', () => {
  const result = spawnSync(
    process.execPath,
    ['--max-old-space-size=256', '-e', 'process.stdout.write(String(require("v8").getHeapStatistics().heap_size_limit))'],
    {
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=2048' },
      encoding: 'utf8',
    }
  );
  assert.equal(result.status, 0, result.stderr);
  const heap = Number(result.stdout);
  assert.ok(heap > 300 * 1024 * 1024, `child argv cap too small ${heap}`);
  assert.ok(heap < 600 * 1024 * 1024, `child argv cap did not beat NODE_OPTIONS ${heap}`);
});
