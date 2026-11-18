/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const {
  TASK_PROCESS_PROTOCOL_VERSION,
  TASK_PROCESS_PATHS,
  assertTaskProcessProtocol,
} = require('@kbn/task-manager-plugin/server/task_process/protocol');
const { fork, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { OUT_DIR } = require('./build');
const {
  elasticsearchConfigFromEnv,
} = require('@kbn/task-manager-plugin/server/task_process/es_config');
const {
  getChildNodeOptions,
} = require('@kbn/task-manager-plugin/server/task_process/child_node_options');

// node scripts/task_bundle_bench [--dir <bundles>] [--name <substring>] [--runs <n>] [--settle <ms>]
//   [--es-url <url>] [--es-user <user>] [--es-password <password>] [--json <file>] [--node-defaults]
//   [--run <request.json>] [--settings <settings.json>] [--init <init.json>]
//   [--cpu-profile <file.cpuprofile>] [--heap-profile <file.heapsnapshot>]
// Processes start with the Node flags Kibana's supervisor gives them (a small young generation);
// `--node-defaults` starts them with Node's own, to compare.
// For every bundle in the manifest: forks it as Kibana's supervisor does, sends `init`, and measures
// the time until the process says it is ready to serve (Core booted, plugins started) and its resident
// memory once idle, before it has served a task. Needs a running Elasticsearch, since Core connects.
const args = process.argv.slice(2);
const getArg = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);

const bundleDir = path.resolve(getArg('--dir', OUT_DIR));
const nameFilter = getArg('--name');
const runs = Number(getArg('--runs', 3));
const settleMs = Number(getArg('--settle', 1500));
const runFile = getArg('--run');
const runRequest = runFile ? JSON.parse(fs.readFileSync(runFile, 'utf8')) : undefined;
const settingsFile = getArg('--settings');
const extraSettings = settingsFile ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
const initFile = getArg('--init');
const extraInit = initFile ? JSON.parse(fs.readFileSync(initFile, 'utf8')) : {};
// A profile pins the bench to the one bundle its file path was given for; forcing one run and one
// bundle keeps it unambiguous which run's cost the file holds.
const cpuProfileFile = getArg('--cpu-profile') && path.resolve(getArg('--cpu-profile'));
const heapProfileFile = getArg('--heap-profile') && path.resolve(getArg('--heap-profile'));
const profiling = Boolean(cpuProfileFile || heapProfileFile);
const readyTimeoutMs = 60000;
// The flags of a process as the supervisor starts it, without Kibana's own.
const childOptions = args.includes('--node-defaults')
  ? { execArgv: [], nodeOptions: undefined }
  : getChildNodeOptions({ execArgv: [], nodeOptions: undefined });

const esConfig = elasticsearchConfigFromEnv({
  ES_URL: getArg('--es-url', 'http://localhost:9200'),
  ES_USERNAME: getArg('--es-user', 'kibana_system'),
  ES_PASSWORD: getArg('--es-password', 'changeme'),
});

// `--runs n` only produces a real median (not n separate bench.js invocations averaged by hand) if
// this itself is a real median: an even sample count (`--runs 2`, the common quick check) was
// picking the higher of the two middle values instead of averaging them, silently biasing every
// number `--runs` produces upward.
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/** Settings a module declares that startup checks for: plugins read their own at run time. */
const getInit = (settingIds) => ({
  kind: 'init',
  elasticsearch: esConfig,
  kibanaVersion: require('@kbn/repo-info').kibanaPackageJson.version,
  authToken: 'bench',
  server: {
    uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
    buildNum: 1,
    isServerless: false,
    isDev: true,
  },
  encryptedSavedObjects: { encryptionKey: 'a'.repeat(32), decryptionOnlyKeys: [] },
  settings: {
    ...Object.fromEntries([
      ...settingIds.map((id) => [id, {}]),
      // What the security task plugin reads when it registers Core's security delegate.
      [
        'security',
        {
          audit: { enabled: false },
          serviceAccounts: { enabled: false },
          applicationName: 'kibana-.kibana',
          kibanaServerResourceURL: 'http://localhost:5601',
        },
      ],
      ['taskManager', { api_key_type: 'es', grant_uiam_api_keys: false }],
    ]),
    ...extraSettings,
  },
  ...extraInit,
});

const rssMb = (pid) =>
  Number(execFileSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' }).trim()) / 1024;

const measureOnce = (file, settingIds) =>
  new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const env = { ...process.env, PORT: '0' };
    if (childOptions.nodeOptions) env.NODE_OPTIONS = childOptions.nodeOptions;
    else delete env.NODE_OPTIONS;
    if (cpuProfileFile) env.TASK_BUNDLE_CPU_PROFILE_FILE = cpuProfileFile;
    else delete env.TASK_BUNDLE_CPU_PROFILE_FILE;
    if (heapProfileFile) env.TASK_BUNDLE_HEAP_PROFILE_FILE = heapProfileFile;
    else delete env.TASK_BUNDLE_HEAP_PROFILE_FILE;
    const child = fork(file, [], {
      env,
      execArgv: [...childOptions.execArgv, '--require', path.join(__dirname, 'memory_probe.js')],
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const timers = {};
    let finished = false;
    let peakRss = 0;
    let startupMs;
    let readyRss;
    let idleRss;
    let runStatus;
    let taskMs;
    let runStarted;
    const probes = {};
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timers.ready);
      clearTimeout(timers.settle);
      child.kill('SIGKILL');
      resolve(result);
    };
    timers.ready = setTimeout(
      () => finish({ error: `not ready in ${readyTimeoutMs} ms` }),
      readyTimeoutMs
    );
    child.once('exit', (code) =>
      finish({
        error: `exited (${code}) before ready: ${
          stderr.split('\n').find((line) => /failed to start|Error/.test(line)) ?? stderr.trim()
        }`,
      })
    );
    child.on('message', (message) => {
      if (message?.kind === 'task-bundle-rss') {
        peakRss = Math.max(peakRss, message.rss / 1048576);
        return;
      }
      if (message?.kind === 'task-bundle-memory') {
        probes[message.phase] = message;
        peakRss = Math.max(peakRss, message.usage.rss / 1048576, message.peakRss / 1048576);
        if (
          (message.phase === 'idle' && !runRequest && !profiling) ||
          message.phase === 'afterRun'
        ) {
          finish({
            startupMs,
            readyRss,
            idleRss,
            peakRss: Math.max(peakRss, readyRss ?? 0, idleRss ?? 0),
            probes,
            runStatus,
            taskMs,
          });
        }
        return;
      }
      if (message?.kind === 'task-bundle-profile') {
        finish({
          startupMs,
          readyRss,
          idleRss,
          peakRss: Math.max(peakRss, readyRss ?? 0, idleRss ?? 0),
          probes,
          runStatus,
          taskMs,
          profile: {
            cpuProfileFile: message.cpuProfileFile,
            heapProfileFile: message.heapProfileFile,
          },
        });
        return;
      }
      if (message?.kind !== 'ready') return;
      try {
        assertTaskProcessProtocol(message);
      } catch (error) {
        finish({ error: error.message });
        return;
      }
      startupMs = Number(process.hrtime.bigint() - started) / 1e6;
      readyRss = rssMb(child.pid);
      // Let startup work that continues after the ready signal finish before reading idle memory.
      timers.settle = setTimeout(async () => {
        try {
          idleRss = rssMb(child.pid);
        } catch (e) {
          idleRss = undefined;
        }
        child.send({ kind: 'task-bundle-memory', phase: 'idle' });
        if (runRequest) {
          try {
            runStarted = process.hrtime.bigint();
            const response = await fetch(
              `http://127.0.0.1:${message.port}${TASK_PROCESS_PATHS.run}`,
              {
                method: 'POST',
                headers: { 'content-type': 'application/json', authorization: 'Bearer bench' },
                body: JSON.stringify({
                  ...runRequest,
                  protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
                }),
              }
            );
            const body = await response.json();
            taskMs = Number(process.hrtime.bigint() - runStarted) / 1e6;
            runStatus = response.status;
            if (!response.ok) {
              child.removeAllListeners('exit');
              finish({ error: `run returned HTTP ${response.status}` });
              return;
            }
            if (body.kind !== 'result' || body.result?.error || body.result?.taskRunError) {
              child.removeAllListeners('exit');
              finish({ error: `task failed: ${JSON.stringify(body)}` });
              return;
            }
            child.send({ kind: 'task-bundle-memory', phase: 'afterRun' });
          } catch (error) {
            child.removeAllListeners('exit');
            finish({ error: `run failed: ${error.message}` });
          }
        } else {
          child.removeAllListeners('exit');
        }
      }, settleMs);
    });
    child.send(getInit(settingIds));
  });

(async () => {
  const manifestFile = path.join(bundleDir, 'manifest.json');
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`No manifest at ${manifestFile}; run node scripts/task_bundle first`);
  }
  const { bundles } = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const selected = Object.entries(bundles).filter(
    ([name, { taskType }]) =>
      !nameFilter || name.includes(nameFilter) || taskType.includes(nameFilter)
  );
  const results = [];
  for (const [name, { file, taskType, bytes, startupBytes }] of selected) {
    // The settings ids the module declares are not in the manifest; any id it asks for at startup is
    // read from the bundle's own error, so retry once with the ids the error names.
    let settingIds = [];
    const samples = [];
    let error;
    for (let i = 0; i < (profiling ? 1 : runs); i++) {
      let sample = await measureOnce(path.join(bundleDir, file), settingIds);
      const missing = sample.error && /not given the settings of: ([\w, ]+)/.exec(sample.error);
      if (missing) {
        settingIds = missing[1].split(',').map((id) => id.trim());
        sample = await measureOnce(path.join(bundleDir, file), settingIds);
      }
      if (sample.error) {
        error = sample.error;
        break;
      }
      samples.push(sample);
    }
    const row = {
      taskType,
      bundle: name,
      bundleMb: bytes ? Math.round(bytes / 1048576) : undefined,
      startupSourceMb: startupBytes ? Math.round((startupBytes / 1048576) * 10) / 10 : undefined,
      ...(error
        ? { error }
        : {
            startupMs: Math.round(median(samples.map((s) => s.startupMs))),
            readyRssMb: Math.round(median(samples.map((s) => s.readyRss))),
            idleRssMb: Math.round(median(samples.map((s) => s.idleRss ?? s.readyRss))),
            peakRssMb: Math.round(median(samples.map((s) => s.peakRss))),
            heapUsedMb: Math.round(
              median(samples.map((s) => s.probes.idle.usage.heapUsed)) / 1048576
            ),
            heapTotalMb: Math.round(
              median(samples.map((s) => s.probes.idle.usage.heapTotal)) / 1048576
            ),
            externalMb: Math.round(
              median(samples.map((s) => s.probes.idle.usage.external)) / 1048576
            ),
            ...(runRequest
              ? {
                  runStatus: samples[0].runStatus,
                  taskMs: Math.round(median(samples.map((s) => s.taskMs))),
                  afterRunRssMb: Math.round(
                    median(samples.map((s) => s.probes.afterRun.usage.rss)) / 1048576
                  ),
                  afterRunHeapUsedMb: Math.round(
                    median(samples.map((s) => s.probes.afterRun.usage.heapUsed)) / 1048576
                  ),
                }
              : {}),
            samples: samples.map((sample) => ({
              startupMs: sample.startupMs,
              readyRssMb: sample.readyRss,
              idleRssMb: sample.idleRss,
              peakRssMb: sample.peakRss,
              heapUsedMb: sample.probes.idle.usage.heapUsed / 1048576,
              ...(runRequest
                ? {
                    taskMs: sample.taskMs,
                    afterRunRssMb: sample.probes.afterRun.usage.rss / 1048576,
                  }
                : {}),
            })),
          }),
    };
    results.push(row);
    console.log(
      error
        ? `${taskType}: FAILED ${error}`
        : `${taskType}: ready in ${row.startupMs} ms, idle ${row.idleRssMb} MB (bundle ${row.bundleMb} MB)`
    );
    const profile = samples[0]?.profile;
    if (profile?.cpuProfileFile) console.log(`  profile written to ${profile.cpuProfileFile}`);
    if (profile?.heapProfileFile) console.log(`  profile written to ${profile.heapProfileFile}`);
  }
  const ok = results.filter((r) => !r.error);
  if (ok.length) {
    console.log(
      `\n${ok.length}/${results.length} measured; startup ms median ${median(
        ok.map((r) => r.startupMs)
      )}, idle MB median ${median(ok.map((r) => r.idleRssMb))}, worst startup ${Math.max(
        ...ok.map((r) => r.startupMs)
      )} ms, worst idle ${Math.max(...ok.map((r) => r.idleRssMb))} MB`
    );
  }
  const json = getArg('--json');
  if (json) fs.writeFileSync(json, `${JSON.stringify(results, null, 2)}\n`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
