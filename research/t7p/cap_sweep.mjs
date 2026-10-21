/**
 * One-process cap sweep against a Kibana that is already up.
 * Correctness of the cap is the point. Scored n≥20 is a separate mode and
 * must be run while bench.lock is held.
 *
 *   node research/t7p/cap_sweep.mjs sweep
 *   node research/t7p/cap_sweep.mjs scored
 */

import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import os from 'node:os';
import { percentile } from './summarize_memory.mjs';
import { rollupDispatchPhases } from './phase_summary.mjs';
import { accountCgroup, deltaAccount, parseMemoryStat, winningCap } from './sweep_summary.mjs';

const exec = promisify(execFile);
const KBN = process.env.T7P_KBN ?? 'http://127.0.0.1:5681';
const AUTH = `Basic ${Buffer.from(process.env.T7P_AUTH ?? 'elastic:changeme').toString('base64')}`;
const CONTAINER = process.env.T7P_CONTAINER ?? 't7p-prod-shape';
const LIMITS = process.env.T7P_LIMITS_HOST ?? '/tmp/t7p-wc/limits/limits.json';
const PREREG = process.env.T7P_PREREG;
const OUT = process.env.T7P_OUT;
const MODE = process.argv[2];

const CELLS = [
  { id: 'old-256-young-default', old: 256, young: 'default' },
  { id: 'old-256-young-32', old: 256, young: 32 },
  { id: 'old-384-young-default', old: 384, young: 'default' },
  { id: 'old-384-young-32', old: 384, young: 32 },
  { id: 'old-512-young-default', old: 512, young: 'default' },
  { id: 'old-512-young-32', old: 512, young: 32 },
  { id: 'old-inherit-young-default', old: 'inherit', young: 'default' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callOnce = async (method, path, body, timeoutMs = 180000) => {
  const res = await fetch(KBN + path, {
    method,
    headers: {
      authorization: AUTH,
      'kbn-xsrf': 't7p-prod-shape-002',
      'x-elastic-internal-origin': 'Kibana',
      'content-type': 'application/json',
      'elastic-api-version': '1',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let parsed = text;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      /* keep text */
    }
  }
  return { status: res.status, body: parsed };
};

const call = async (method, path, body, timeoutMs = 180000) => {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await callOnce(method, path, body, timeoutMs);
    } catch (error) {
      last = error;
      const code = error.cause?.code ?? '';
      if (code === 'ECONNREFUSED' || attempt === 3) throw error;
      process.stderr.write(`t7p fetch ${method} ${path} attempt ${attempt} ${code || error.name}\n`);
      const alive = await inspectContainer().catch(() => 'inspect-failed');
      if (alive.includes('oom=true') || alive.startsWith('exited') || alive.startsWith('dead')) {
        process.stderr.write(`t7p container stopped ${alive}\n`);
        throw error;
      }
      await sleep(2000);
    }
  }
  throw last;
};

const writeLimits = (cell) => {
  const limits = {};
  if (cell.old !== 'inherit') limits.maxOldGenerationSizeMb = cell.old;
  if (cell.young !== 'default') limits.maxYoungGenerationSizeMb = cell.young;
  const tmp = `${LIMITS}.tmp`;
  writeFileSync(tmp, JSON.stringify(limits));
  renameSync(tmp, LIMITS);
  return limits;
};

const readCgroup = async () => {
  const { stdout } = await exec(
    'docker',
    ['exec', CONTAINER, 'sh', '-c', 'printf "CURRENT "; cat /sys/fs/cgroup/memory.current; printf "\\nMAX "; cat /sys/fs/cgroup/memory.max; printf "\\nSTAT\\n"; cat /sys/fs/cgroup/memory.stat'],
    { timeout: 5000 }
  );
  const currentLine = stdout.match(/^CURRENT\s+(\d+)/m);
  const maxLine = stdout.match(/^MAX\s+(\S+)/m);
  const statText = stdout.split('\nSTAT\n')[1] ?? '';
  const current = Number(currentLine?.[1]);
  return {
    current,
    max: maxLine?.[1] ?? null,
    account: accountCgroup(current, parseMemoryStat(statText)),
    stat: parseMemoryStat(statText),
  };
};

const inspectContainer = async () => {
  const { stdout } = await exec('docker', [
    'inspect',
    '-f',
    '{{.State.Status}} oom={{.State.OOMKilled}} exit={{.State.ExitCode}} mem={{.HostConfig.Memory}} swap={{.HostConfig.MemorySwap}} nano={{.HostConfig.NanoCpus}}',
    CONTAINER,
  ]);
  return stdout.trim();
};

const oomKilled = async () => {
  for (let i = 0; i < 10; i++) {
    try {
      const line = await inspectContainer();
      if (line.includes('oom=true')) return line;
      if (!line.startsWith('running')) return line;
    } catch {
      /* inspect can race the kill */
    }
    await sleep(300);
  }
  return null;
};

const safeCommand = (command) =>
  command.slice(0, 140).replace(/[A-Za-z0-9+/=_-]{40,}/g, '[redacted]');

const hostPressure = async () => {
  const { stdout } = await exec('ps', ['-ax', '-o', 'pid=,pcpu=,rss=,command=']);
  const parsed = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+([0-9.]+)\s+(\d+)\s+(.*)$/);
      if (!match) return null;
      return { pid: Number(match[1]), pcpu: Number(match[2]), rss: Number(match[3]), command: match[4] };
    })
    .filter(Boolean);
  const top = [...parsed].sort((left, right) => right.pcpu - left.pcpu).slice(0, 12);
  const otherLeadHeavy = parsed.filter(
    (row) =>
      row.pcpu >= 15 &&
      /5691|5701|9291|9301|t7w|t7b/.test(row.command) &&
      !/cap_sweep|run_cap_sweep/.test(row.command)
  );
  let vmLoad = null;
  try {
    const { stdout: load } = await exec('docker', ['exec', CONTAINER, 'cat', '/proc/loadavg'], {
      timeout: 3000,
    });
    vmLoad = load.trim();
  } catch {
    vmLoad = null;
  }
  return {
    hostLoad: os.loadavg(),
    vmLoad,
    top: top.map((row) => safeCommand(`${row.pid} ${row.pcpu} ${row.rss} ${row.command}`)),
    otherLeadHeavy: otherLeadHeavy.map((row) =>
      safeCommand(`${row.pid} ${row.pcpu} ${row.command}`)
    ),
    invalid: otherLeadHeavy.length > 0,
  };
};

const valueOf = (body) => body?.value ?? body;

const survivedOutcome = (body) => {
  const value = valueOf(body);
  if (!value || typeof value !== 'object') return { survived: false, reason: 'empty' };
  if (value.status === 'failure' || value.status === 'terminated') {
    return { survived: false, reason: `${value.status}:${value.reason ?? value.error ?? ''}`.slice(0, 400) };
  }
  if (value.memory?.heapUsed == null || value.bootMs == null) {
    return { survived: false, reason: 'missing-boot-memory' };
  }
  return { survived: true, value };
};

const sampleMain = async () => {
  const info = await call('GET', '/internal/workload_isolation_research/info', undefined, 10000);
  if (info.status !== 200 || !info.body?.main_memory) return null;
  return info.body;
};

const pollDuring = async (work) => {
  const samples = [];
  let stop = false;
  const loop = (async () => {
    while (!stop) {
      const at = new Date().toISOString();
      const row = { at };
      try {
        row.cgroup = await readCgroup();
      } catch (error) {
        row.cgroupError = String(error).slice(0, 200);
      }
      try {
        const info = await sampleMain();
        if (info) {
          row.mainHeapUsed = info.main_memory.heapUsed;
          row.mainRss = info.main_memory.rss;
          row.mainHeapTotal = info.main_memory.heapTotal;
        }
      } catch (error) {
        row.infoError = String(error).slice(0, 200);
      }
      samples.push(row);
      await sleep(250);
    }
  })();
  let result;
  let error;
  try {
    result = await work();
  } catch (err) {
    error = err;
  }
  stop = true;
  await loop;
  return { samples, result, error };
};

const peakOf = (samples) => {
  const usable = samples.filter((row) => row.cgroup?.current > 0);
  if (usable.length === 0) return null;
  return usable.reduce((best, row) => (row.cgroup.current > best.cgroup.current ? row : best));
};

const persist = (state) => {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(state));
};

const assertPrereg = () => {
  if (!PREREG || !OUT) throw new Error('T7P_PREREG and T7P_OUT are required');
  const prereg = JSON.parse(readFileSync(PREREG, 'utf8'));
  const expected =
    MODE === 'rootcause'
      ? ['t7p-prod-shape-mem-003']
      : MODE === 'effective'
        ? ['t7p-prod-shape-mem-004', 't7p-prod-shape-mem-007']
        : MODE === 'phases'
          ? ['t7p-prod-shape-mem-005', 't7p-prod-shape-mem-006', 't7p-prod-shape-mem-009']
          : MODE === 'process'
            ? ['t7p-prod-shape-mem-008']
            : ['t7p-prod-shape-mem-002'];
  if (!expected.includes(prereg.run_id)) throw new Error(`unexpected prereg ${prereg.run_id}`);
  if (Date.parse(prereg.written_at) > Date.now()) throw new Error('prereg written_at is in the future');
  return prereg;
};

const waitReady = async () => {
  let last = 'no-http';
  for (let i = 0; i < 150; i++) {
    const inspect = await inspectContainer().catch((error) => `inspect-failed ${error}`);
    if (!inspect.startsWith('running')) {
      throw new Error(`kibana container not running: ${inspect}`);
    }
    try {
      const info = await call('GET', '/internal/workload_isolation_research/info', undefined, 5000);
      last = `http-${info.status}`;
      if (info.status === 200 && info.body?.build_sha && info.body?.main_memory?.pointerCompression === true) {
        return info.body;
      }
      if (info.status === 200 && info.body?.build_sha) {
        last = `http-200 pc=${info.body?.main_memory?.pointerCompression}`;
      }
    } catch (error) {
      last = String(error.name ?? error).slice(0, 80);
    }
    await sleep(2000);
  }
  throw new Error(`kibana did not become ready (${last})`);
};

const stopHost = async () => {
  await call('POST', '/internal/workload_isolation_research/t7a/host/_stop', {});
  await sleep(500);
};

const recentLimitLog = async () => {
  try {
    const logs = await exec(
      'sh',
      ['-c', `docker logs ${CONTAINER} 2>&1 | grep t7p-worker-limits | tail -4`],
      { timeout: 20000, maxBuffer: 1_000_000 }
    );
    return `${logs.stdout}\n${logs.stderr}`
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('t7p-worker-limits'));
  } catch {
    return [];
  }
};

const limitLogMatches = (cell, lines) => {
  const last = lines[lines.length - 1] ?? '';
  if (!last.includes(`"maxOldGenerationSizeMb":${cell.old}`)) return false;
  if (cell.young === 32 && !last.includes('"maxYoungGenerationSizeMb":32')) return false;
  if (cell.young === 'default' && last.includes('maxYoungGenerationSizeMb')) return false;
  return true;
};

const configureHost = async () => {
  await call('POST', '/internal/workload_isolation_research/t7a/config', {
    mode: 'offmain',
    transport: process.env.T7P_TRANSPORT === 'process' ? 'process' : 'thread',
    slots: 1,
    concurrency: 1,
    localSo: true,
  });
};

/** Bring the exited container back so a later cap can still be measured. */
const restartContainer = async () => {
  await exec('docker', ['start', CONTAINER], { timeout: 60000 });
  const ready = await waitReady();
  await configureHost();
  const cgroup = await readCgroup();
  const info = await sampleMain();
  return { ready, cgroup: cgroup.account, info };
};

const oneCell = async (cell, mainOnlyAccount) => {
  const limits = writeLimits(cell);
  await stopHost();
  const before = await readCgroup();
  const beforeInfo = await sampleMain();
  const polled = await pollDuring(() =>
    call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'coldstart' })
  );
  const inspect = await inspectContainer();
  const killed = inspect.includes('oom=true') ? inspect : polled.error ? await oomKilled() : null;
  const http = polled.result;
  const outcome = http && http.status < 300 ? survivedOutcome(http.body) : { survived: false, reason: `http-${http?.status ?? 'throw'}` };
  let retained = null;
  let after = null;
  if (outcome.survived && !killed) {
    await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'gc' });
    const stats = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'stats' });
    retained = valueOf(stats.body)?.memory ?? null;
    await sleep(1000);
    after = await readCgroup();
    await stopHost();
  }
  const peak = peakOf(polled.samples);
  const endBoot = outcome.value?.memory ?? null;
  const limitLog = await recentLimitLog();
  const applied = cell.old === 'inherit' || limitLogMatches(cell, limitLog);
  const survived = Boolean(outcome.survived) && !killed && applied;
  const reason = !applied
    ? 'cap-not-applied'
    : killed
      ? `oom ${killed}`
      : outcome.reason ?? null;
  return {
    id: cell.id,
    old: cell.old,
    young: cell.young,
    limits,
    capApplied: applied,
    survived,
    reason,
    coldStartMs: http?.body?.coldStartMs ?? null,
    bootMs: outcome.value?.bootMs ?? null,
    waitedMs: outcome.value?.waitedMs ?? null,
    endOfBootHeap: endBoot,
    retainedHeap: retained,
    before: before.account,
    beforeMainHeap: beforeInfo?.main_memory ?? null,
    after: after?.account ?? null,
    anonDeltaVsMainOnly: after ? deltaAccount(after.account, mainOnlyAccount) : null,
    peak: peak
      ? {
          at: peak.at,
          account: peak.cgroup.account,
          mainHeapUsed: peak.mainHeapUsed ?? null,
          mainRss: peak.mainRss ?? null,
          deltaVsMainOnly: deltaAccount(peak.cgroup.account, mainOnlyAccount),
        }
      : null,
    inspect,
    sampleCount: polled.samples.length,
    error: polled.error ? String(polled.error).slice(0, 300) : null,
    limitLog,
  };
};

const sweep = async (prereg) => {
  const ready = await waitReady();
  if (!String(ready.node_options).includes('--max-old-space-size=1638')) {
    throw new Error(`main heap flag is not 1638: ${ready.node_options}`);
  }
  if (!ready.build_sha.startsWith('63f36682c19c')) throw new Error(`unexpected build ${ready.build_sha}`);
  await configureHost();
  const mainOnlyInfo = await sampleMain();
  const mainOnlyCgroup = await readCgroup();
  const pressureStart = await hostPressure();
  const state = {
    run_id: prereg.run_id,
    prereg_written_at: prereg.written_at,
    mode: 'sweep',
    label: 'LOCAL CGROUP EMULATION (colima VM, 2 CPU), not serverless evidence',
    at: new Date().toISOString(),
    inspect: await inspectContainer(),
    ready: {
      build_sha: ready.build_sha,
      node: ready.node,
      node_options: ready.node_options,
      cpus: ready.cpus,
      constrained_memory: ready.constrained_memory,
      pointerCompression: ready.main_memory.pointerCompression,
    },
    mainOnly: { info: mainOnlyInfo, cgroup: mainOnlyCgroup.account },
    pressureStart,
    cells: [],
    restarts: [],
  };
  persist(state);
  let baseline = mainOnlyCgroup.account;
  for (const cell of CELLS) {
    const alive = await inspectContainer().catch(() => 'missing');
    if (!alive.startsWith('running')) {
      process.stdout.write(`restart before ${cell.id} (${alive})\n`);
      try {
        const restarted = await restartContainer();
        baseline = restarted.cgroup;
        state.restarts.push({
          beforeCell: cell.id,
          after: alive,
          build_sha: restarted.ready.build_sha,
          cgroup: restarted.cgroup,
        });
      } catch (error) {
        state.restartFailed = { beforeCell: cell.id, error: String(error).slice(0, 400) };
        persist(state);
        break;
      }
    }
    process.stdout.write(`cell ${cell.id}\n`);
    let row;
    try {
      row = await oneCell(cell, baseline);
    } catch (error) {
      row = {
        id: cell.id,
        old: cell.old,
        young: cell.young,
        survived: false,
        reason: String(error).slice(0, 400),
      };
    }
    state.cells.push(row);
    state.winner = winningCap(state.cells);
    persist(state);
    process.stdout.write(
      `${cell.id} survived=${row.survived} cold=${row.coldStartMs} boot=${row.bootMs}\n`
    );
  }
  state.pressureEnd = await hostPressure().catch(() => null);
  state.winner = winningCap(state.cells);
  persist(state);
  process.stdout.write(`winner ${JSON.stringify(state.winner)}\n`);
};

const percentileOf = (rows, key) => {
  if (!rows.length) return null;
  const values = rows.map((row) => row[key]);
  return { n: rows.length, p50: percentile(values, 50), p95: percentile(values, 95) };
};

const scored = async (prereg) => {
  const prior = JSON.parse(readFileSync(OUT, 'utf8'));
  const winner = prior.winner ?? winningCap(prior.cells ?? []);
  if (!winner) throw new Error('no surviving cap to score');
  writeLimits(winner);
  const ready = await waitReady();
  await configureHost();
  const pressureStart = await hostPressure();
  const cold = [];
  for (let i = 0; i < 20; i++) {
    const row = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'coldstart' });
    const value = valueOf(row.body);
    cold.push({
      i,
      status: row.status,
      coldStartMs: row.body?.coldStartMs ?? null,
      bootMs: value?.bootMs ?? null,
      waitedMs: value?.waitedMs ?? null,
      heapUsed: value?.memory?.heapUsed ?? null,
    });
    if (row.status >= 300 || value?.bootMs == null) break;
  }
  const warmBoot = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    const row = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'boot' });
    const value = valueOf(row.body);
    warmBoot.push({
      i,
      clientMs: performance.now() - t0,
      waitedMs: value?.waitedMs ?? null,
      bootMs: value?.bootMs ?? null,
    });
  }
  const warmStats = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    const row = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'stats' });
    warmStats.push({ i, clientMs: performance.now() - t0, status: row.status });
  }
  const coldOk = cold.filter((row) => row.bootMs != null);
  const pressureEnd = await hostPressure();
  const result = {
    ...prior,
    scored: {
      at: new Date().toISOString(),
      winner,
      bench_lock: true,
      label: 'scored under bench.lock. LOCAL CGROUP EMULATION, not serverless evidence',
      ready_sha: ready.build_sha,
      node_options: ready.node_options,
      pressureStart,
      pressureEnd,
      invalid: Boolean(pressureStart.invalid || pressureEnd.invalid),
      cold,
      warmBoot,
      warmStats,
      summary: {
        cold: coldOk.length ? percentileOf(coldOk, 'coldStartMs') : null,
        coldBoot: coldOk.length ? percentileOf(coldOk, 'bootMs') : null,
        coldWaited: coldOk.length ? percentileOf(coldOk, 'waitedMs') : null,
        warmBootWaited: percentileOf(warmBoot.filter((row) => row.waitedMs != null), 'waitedMs'),
        warmBootClient: percentileOf(warmBoot, 'clientMs'),
        warmStatsClient: percentileOf(warmStats, 'clientMs'),
        bootMsUnchanged: new Set(warmBoot.map((row) => row.bootMs)).size === 1,
      },
    },
  };
  persist(result);
  process.stdout.write(`${JSON.stringify(result.scored.summary)}\n`);
};

const rootcause = async (prereg) => {
  const cell = { id: 'old-512-young-default', old: 512, young: 'default' };
  writeLimits(cell);
  const ready = await waitReady();
  if (!String(ready.node_options).includes('--max-old-space-size=3277')) {
    throw new Error(`main heap flag is not 3277: ${ready.node_options}`);
  }
  await configureHost();
  const pressureStart = await hostPressure();
  const cold = [];
  for (let i = 0; i < 20; i++) {
    const row = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'coldstart' });
    const value = valueOf(row.body);
    cold.push({
      i,
      status: row.status,
      coldStartMs: row.body?.coldStartMs ?? null,
      bootMs: value?.bootMs ?? null,
      waitedMs: value?.waitedMs ?? null,
      heapUsed: value?.memory?.heapUsed ?? null,
    });
    if (row.status >= 300 || value?.bootMs == null) break;
  }
  const warmBoot = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    const row = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'boot' });
    const value = valueOf(row.body);
    warmBoot.push({
      i,
      status: row.status,
      clientMs: performance.now() - t0,
      waitedMs: value?.waitedMs ?? null,
      bootMs: value?.bootMs ?? null,
    });
  }
  const warmStats = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    const row = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'stats' });
    warmStats.push({ i, clientMs: performance.now() - t0, status: row.status });
  }
  await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'gc' });
  const retained = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'stats' });
  const cgroup = await readCgroup();
  const main = await sampleMain();
  const coldOk = cold.filter((row) => row.bootMs != null);
  const limitLog = await recentLimitLog();
  const pressureEnd = await hostPressure();
  const result = {
    run_id: prereg.run_id,
    prereg_written_at: prereg.written_at,
    label: 'LOCAL CGROUP EMULATION (colima VM, 2 CPU), not serverless evidence. Not a pod-fit verdict.',
    at: new Date().toISOString(),
    purpose: 'locked cold/warm/stats on a 4 GiB cgroup because every 2 GiB cap OOM-killed the process',
    ready: {
      build_sha: ready.build_sha,
      node_options: ready.node_options,
      pointerCompression: ready.main_memory.pointerCompression,
      cpus: ready.cpus,
      constrained_memory: ready.constrained_memory,
    },
    cell,
    capApplied: limitLogMatches(cell, limitLog),
    limitLog,
    bench_lock: true,
    pressureStart,
    pressureEnd,
    invalid: Boolean(pressureStart.invalid || pressureEnd.invalid),
    cold,
    warmBoot,
    warmStats,
    retainedHeap: valueOf(retained.body)?.memory ?? null,
    cgroupAfterGc: cgroup.account,
    mainAfterGc: main?.main_memory ?? null,
    summary: {
      cold: coldOk.length ? percentileOf(coldOk, 'coldStartMs') : null,
      coldBoot: coldOk.length ? percentileOf(coldOk, 'bootMs') : null,
      coldWaited: coldOk.length ? percentileOf(coldOk, 'waitedMs') : null,
      warmBootWaited: percentileOf(warmBoot.filter((row) => row.waitedMs != null), 'waitedMs'),
      warmBootClient: percentileOf(warmBoot, 'clientMs'),
      warmStatsClient: percentileOf(warmStats, 'clientMs'),
      bootMsUnchanged: new Set(warmBoot.map((row) => row.bootMs)).size === 1,
    },
  };
  persist(result);
  process.stdout.write(`${JSON.stringify(result.summary)}\n`);
};

/** Caps that V8 can actually apply: parent has no --max-old-space-size. Not production shape. */
const effective = async (prereg) => {
  const ready = await waitReady();
  if (String(ready.node_options).includes('max-old-space-size')) {
    throw new Error(`parent old-space flag is set: ${ready.node_options}`);
  }
  await configureHost();
  const mainOnly = await readCgroup();
  const caps = Array.isArray(prereg.worker_caps) ? prereg.worker_caps : [256, 512];
  const cells = caps.map((old) => ({ id: `old-${old}-young-default`, old, young: 'default' }));
  const state = {
    run_id: prereg.run_id,
    prereg_written_at: prereg.written_at,
    label:
      'LOCAL CGROUP EMULATION. Parent has no --max-old-space-size so resourceLimits can bind. Not production shape and not a pod-fit verdict.',
    at: new Date().toISOString(),
    ready: {
      build_sha: ready.build_sha,
      node_options: ready.node_options,
      pointerCompression: ready.main_memory.pointerCompression,
      constrained_memory: ready.constrained_memory,
    },
    mainOnly: mainOnly.account,
    pressureStart: await hostPressure(),
    cells: [],
  };
  persist(state);
  let baseline = mainOnly.account;
  for (const cell of cells) {
    const alive = await inspectContainer().catch(() => 'missing');
    if (!alive.startsWith('running')) {
      try {
        const restarted = await restartContainer();
        baseline = restarted.cgroup;
      } catch (error) {
        state.restartFailed = String(error).slice(0, 300);
        break;
      }
    }
    const row = await oneCell(cell, baseline);
    state.cells.push(row);
    persist(state);
    process.stdout.write(`${cell.id} survived=${row.survived} heap=${row.endOfBootHeap?.heapUsed ?? 'na'}\n`);
    if (row.endOfBootHeap?.heapUsed > 900 * 1024 * 1024) {
      state.capStillIneffective = cell.id;
      break;
    }
  }
  state.pressureEnd = await hostPressure().catch(() => null);
  persist(state);
};

/** Warm dispatch phases. One cold start is warmup only and is not a scored p95. */
const phases = async (prereg) => {
  const ready = await waitReady();
  if (!String(ready.node_options).includes('--max-old-space-size=3277')) {
    throw new Error(`main heap flag is not 3277: ${ready.node_options}`);
  }
  await configureHost();
  const pressureStart = await hostPressure();
  if (pressureStart.invalid) {
    persist({
      run_id: prereg.run_id,
      at: new Date().toISOString(),
      aborted: 'other lead heavy before samples',
      pressureStart,
      invalid: true,
    });
    throw new Error('other lead heavy before samples');
  }
  const warmup = await call('POST', '/internal/workload_isolation_research/t7a/probe', {
    kind: 'coldstart',
  });
  const warmupValue = valueOf(warmup.body);
  const warm = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    const row = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'phases' });
    const value = valueOf(row.body);
    const marks = value?.phases;
    const clientMs = performance.now() - t0;
    const sample = marks ? { clientMs, ...marks } : null;
    warm.push({
      i,
      status: row.status,
      clientMs,
      bootMs: value?.bootMs ?? null,
      waitedMs: value?.waitedMs ?? null,
      phases: marks ?? null,
      error: marks ? null : JSON.stringify(value ?? row.body).slice(0, 400),
      rollup: sample ? rollupDispatchPhases(sample) : null,
    });
    if (!marks) break;
  }
  const warmStats = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    const row = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'stats' });
    warmStats.push({ i, clientMs: performance.now() - t0, status: row.status });
  }
  const pressureEnd = await hostPressure();
  const ok = warm.filter((row) => row.rollup);
  const field = (name) => ok.map((row) => ({ value: row.rollup[name] }));
  const component = (name) => ok.map((row) => ({ value: row.phases[name] }));
  const result = {
    run_id: prereg.run_id,
    prereg_written_at: prereg.written_at,
    label:
      'LOCAL CGROUP EMULATION (colima VM, 2 CPU), not serverless evidence. Phase attribution only. Not a pod-fit verdict.',
    at: new Date().toISOString(),
    purpose:
      'Per-phase warm dispatch on the resident alerting island. Cold start is warmup, not a scored p95.',
    ready: {
      build_sha: ready.build_sha,
      node_options: ready.node_options,
      pointerCompression: ready.main_memory.pointerCompression,
      cpus: ready.cpus,
      constrained_memory: ready.constrained_memory,
    },
    bench_lock: true,
    pressureStart,
    pressureEnd,
    invalid: Boolean(pressureStart.invalid || pressureEnd.invalid),
    warmup: {
      status: warmup.status,
      coldStartMs: warmup.body?.coldStartMs ?? null,
      bootMs: warmupValue?.bootMs ?? null,
    },
    warm,
    warmStats,
    summary: {
      n: ok.length,
      bootMsUnchanged: new Set(ok.map((row) => row.bootMs)).size === 1,
      transport: percentileOf(field('transportMs'), 'value'),
      replicaSnapshotRefresh: percentileOf(field('replicaSnapshotRefreshMs'), 'value'),
      parityDefinitionChecks: percentileOf(field('parityDefinitionChecksMs'), 'value'),
      islandReentry: percentileOf(field('islandReentryMs'), 'value'),
      workloadSetup: percentileOf(field('workloadSetupMs'), 'value'),
      bootBody: percentileOf(field('bootBodyMs'), 'value'),
      snapshotDecode: percentileOf(component('snapshotDecodeMs'), 'value'),
      secondDecode: percentileOf(component('secondDecodeMs'), 'value'),
      replicaRefresh: percentileOf(component('replicaRefreshMs'), 'value'),
      readiness: percentileOf(component('readinessMs'), 'value'),
      definitionParity: percentileOf(component('definitionParityMs'), 'value'),
      client: percentileOf(ok.map((row) => ({ value: row.clientMs })), 'value'),
      statsClient: percentileOf(
        warmStats.filter((row) => row.status === 200).map((row) => ({ value: row.clientMs })),
        'value'
      ),
      workloadNote: ok[0]?.phases?.workloadNote ?? null,
      workloadType: ok[0]?.phases?.workloadType ?? null,
      soTypeCount: ok[0]?.phases?.soTypeCount ?? null,
      fingerprintCount: ok[0]?.phases?.fingerprintCount ?? null,
      parityDiffs: ok[0]?.phases?.parityDiffs ?? null,
      sample0ClientMs: ok[0]?.clientMs ?? null,
    },
  };
  persist(result);
  process.stdout.write(`${JSON.stringify(result.summary)}\n`);
};

/** Process child with its own argv old-space cap. Parent keeps the production flag. */
const processArm = async (prereg) => {
  const ready = await waitReady();
  const options = String(ready.node_options);
  if (!options.includes('max-old-space-size')) {
    throw new Error(`parent old-space flag missing: ${options}`);
  }
  const cap = Number(process.env.T7P_PROCESS_OLD_SPACE_MB);
  if (![256, 384, 512].includes(cap)) throw new Error(`cap must be 256, 384, or 512, got ${cap}`);
  if (process.env.T7P_TRANSPORT !== 'process') throw new Error('T7P_TRANSPORT=process is required');
  await configureHost();
  const pressureStart = await hostPressure();
  const coldN = Number(process.env.T7P_COLD_N || '20');
  const cold = [];
  let survived = false;
  for (let i = 0; i < coldN; i++) {
    const polled = await pollDuring(() =>
      call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'coldstart' })
    );
    const inspect = await inspectContainer().catch((error) => `inspect-failed ${error}`);
    const http = polled.result;
    const value = valueOf(http?.body);
    const killed = inspect.includes('oom=true') || inspect.includes('exited') || inspect.includes('dead');
    const ok = Boolean(http && http.status < 300 && value && !killed);
    cold.push({
      i,
      status: http?.status ?? null,
      coldStartMs: http?.body?.coldStartMs ?? null,
      bootMs: value?.bootMs ?? null,
      heap: value?.memory ?? null,
      killed,
      inspect,
      peak: peakOf(polled.samples),
      error: polled.error ? String(polled.error).slice(0, 300) : null,
    });
    survived = ok;
    if (!ok) break;
  }
  const warm = [];
  const warmStats = [];
  let after = null;
  if (survived) {
    await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'gc' });
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      const row = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'phases' });
      const value = valueOf(row.body);
      const marks = value?.phases;
      const clientMs = performance.now() - t0;
      const sample = marks ? { clientMs, ...marks } : null;
      warm.push({
        i,
        status: row.status,
        clientMs,
        bootMs: value?.bootMs ?? null,
        phases: marks ?? null,
        error: marks ? null : JSON.stringify(value ?? row.body).slice(0, 400),
        rollup: sample ? rollupDispatchPhases(sample) : null,
      });
      if (!marks) break;
    }
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      const row = await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'stats' });
      warmStats.push({ i, clientMs: performance.now() - t0, status: row.status });
    }
    after = await readCgroup();
  }
  const pressureEnd = await hostPressure().catch(() => null);
  const ok = warm.filter((row) => row.rollup);
  const field = (name) => ok.map((row) => ({ value: row.rollup[name] }));
  const component = (name) => ok.map((row) => ({ value: row.phases[name] }));
  const coldOk = cold.filter((row) => row.coldStartMs != null && !row.killed);
  const result = {
    run_id: prereg.run_id,
    prereg_written_at: prereg.written_at,
    label:
      'LOCAL CGROUP EMULATION (colima VM, 2 CPU), not serverless evidence. Process child argv cap. Not a pod-fit verdict.',
    at: new Date().toISOString(),
    cap,
    survived,
    ready: {
      build_sha: ready.build_sha,
      node_options: ready.node_options,
      pointerCompression: ready.main_memory.pointerCompression,
      constrained_memory: ready.constrained_memory,
    },
    bench_lock: true,
    pressureStart,
    pressureEnd,
    invalid: Boolean(pressureStart.invalid || pressureEnd?.invalid),
    cold,
    warm,
    warmStats,
    cgroupAfter: after?.account ?? null,
    summary: {
      coldN: coldOk.length,
      cold: coldOk.length ? percentileOf(coldOk, 'coldStartMs') : null,
      coldBoot: coldOk.length ? percentileOf(coldOk, 'bootMs') : null,
      heapSizeLimit: coldOk.at(-1)?.heap?.heapSizeLimit ?? null,
      endOfBootHeap: coldOk.at(-1)?.heap ?? null,
      warmN: ok.length,
      readiness: ok.length ? percentileOf(component('readinessMs'), 'value') : null,
      client: ok.length ? percentileOf(ok.map((row) => ({ value: row.clientMs })), 'value') : null,
      transport: ok.length ? percentileOf(field('transportMs'), 'value') : null,
      parityDefinitionChecks: ok.length ? percentileOf(field('parityDefinitionChecksMs'), 'value') : null,
      islandReentry: ok.length ? percentileOf(field('islandReentryMs'), 'value') : null,
      statsClient: percentileOf(
        warmStats.filter((row) => row.status === 200).map((row) => ({ value: row.clientMs })),
        'value'
      ),
    },
  };
  persist(result);
  process.stdout.write(`${JSON.stringify({ cap, survived, invalid: result.invalid, summary: result.summary })}\n`);
};

const main = async () => {
  const prereg = assertPrereg();
  if (MODE === 'sweep') await sweep(prereg);
  else if (MODE === 'scored') await scored(prereg);
  else if (MODE === 'rootcause') await rootcause(prereg);
  else if (MODE === 'effective') await effective(prereg);
  else if (MODE === 'phases') await phases(prereg);
  else if (MODE === 'process') await processArm(prereg);
  else throw new Error('mode must be sweep, scored, rootcause, effective, phases, or process');
};

main().catch((error) => {
  const code = error.cause?.code ? ` cause=${error.cause.code}` : '';
  process.stderr.write(`${error.stack ?? error}${code}\n`);
  process.exit(1);
});
