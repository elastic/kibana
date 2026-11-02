/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname, platform, release, cpus, totalmem } from 'node:os';
import { resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { parse, stringify } from 'yaml';

interface JsonObject { [key: string]: JsonValue }
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface Step { name: string; type: string; with: Record<string, string> }
interface Workflow { id: string; yaml: string; definition: { steps: Step[] } }
interface Execution {
  id: string; status: string;
  stepExecutions?: { stepId: string; status: string; output?: JsonObject; startedAt?: string; finishedAt?: string }[];
}
interface Frozen {
  workflowId: string; yaml: string; definitionHash: string;
  alertIndex: string; fixtureHash: string; mapping: JsonObject; fixtures: JsonObject;
}
interface Segment {
  backend: string; condition?: string; addedRttMs: number; workflowRunId?: string;
  invocationId?: string; artifactHash?: string; failure?: string; hostTotalMs: number;
  startedEpochMs: number; at: string;
  invocationHttpMs?: number; launchMs?: number;
  containerId?: string; containerRemoved?: boolean; containerReleasedAtEpochMs?: number; inspection?: string;
  traffic: { sentBytes: number; receivedBytes: number } | { sentBytes: number; receivedBytes: number }[];
  rpcCalls?: { name: string; durationMs: number; failed: boolean }[];
  result?: { status: string; metrics?: { executionMs: number } };
  response?: { result: { status: string }; metrics: { executionMs: number; setupMs: number; effectiveRttMs: number } };
}

const [command, ...argv] = process.argv.slice(2);
const option = (name: string, fallback?: string): string => {
  const index = argv.indexOf(`--${name}`);
  const value = index >= 0 ? argv[index + 1] : fallback;
  if (!value) throw new Error(`Missing --${name}`);
  return value;
};
const hash = (value: object | string): string => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const save = (path: string, value: object): void => writeFileSync(path, JSON.stringify(value, null, 2));
const append = (path: string, value: object): void => appendFileSync(path, `${JSON.stringify(value)}\n`);
const docker = (...args: string[]): string => execFileSync('docker', args, { encoding: 'utf8' }).trim();

async function api<T>(base: string, path: string, method = 'GET', body?: object): Promise<T> {
  const credential = base === process.env.ES_URL ? process.env.ES_AUTHORIZATION : process.env.KIBANA_AUTHORIZATION;
  if (!credential) throw new Error('Set KIBANA_AUTHORIZATION / ES_AUTHORIZATION (e.g. Basic base64(user:password))');
  const response = await fetch(`${base}${path}`, {
    method, headers: { authorization: credential, 'kbn-xsrf': 'workflows-faas', 'elastic-api-version': '2023-10-31', 'content-type': 'application/json' },
    body: body && JSON.stringify(body), signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text}`);
  return JSON.parse(text) as T;
}

function assertAnchor(workflow: Workflow): Step[] {
  const definition = workflow.definition ?? parse(workflow.yaml);
  const steps: Step[] = definition.steps;
  if (steps.length !== 3 || steps[0].name !== 'graph' || steps[0].type !== 'security.buildAlertEntityGraph' ||
    steps[1].type !== 'wait' || steps[1].with.duration !== '6s' || steps[2].type !== 'cases.createCase' ||
    steps[2].with.title !== 'Graph nodes {{ steps.graph.output.stats.nodes }}') {
    throw new Error('Only the frozen graph -> wait 6s -> saved-graph-title Case anchor is supported');
  }
  return steps;
}

async function snapshot(): Promise<{ workflow: Workflow; fixtures: JsonObject; mapping: JsonObject; alertIndex: string }> {
  const base = option('kibana', process.env.KIBANA_URL ?? 'http://localhost:5601');
  const workflow = await api<Workflow>(base, `/api/workflows/workflow/${encodeURIComponent(option('workflow', 'remote-engine-loop'))}`);
  const steps = assertAnchor(workflow);
  const alertIndex = steps[0].with.alertIndex;
  const es = process.env.ES_URL;
  if (!es || !alertIndex || /[*?,]/.test(alertIndex)) throw new Error('ES_URL and a single concrete fixture index are required');
  const mapping = await api<JsonObject>(es, `/${encodeURIComponent(alertIndex)}/_mapping`);
  const fixtures = await api<JsonObject>(es, `/${encodeURIComponent(alertIndex)}/_search`, 'POST', {
    size: 1000, track_total_hits: true, sort: [{ 'kibana.alert.uuid': 'asc' }], query: { match_all: {} },
  });
  const hits = fixtures.hits as JsonObject;
  const total = hits.total as JsonObject;
  if (Number(total.value) > 1000) throw new Error('Fixture snapshot exceeds 1000 documents; refusing partial freeze');
  // Search timing/shard metadata varies. Freeze source documents and stable identities only.
  fixtures.hits = { total: hits.total, hits: (hits.hits as JsonObject[]).map((hit) => ({ _index: hit._index, _id: hit._id, _source: hit._source })) };
  delete fixtures.took; delete fixtures._shards;
  return { workflow, fixtures, mapping, alertIndex };
}

async function verifySegments(executionId: string, path: string, backend: string, expectedMemoryMiB: number): Promise<Segment[]> {
  const deadline = Date.now() + 30_000;
  let segments: Segment[] = [];
  while (true) {
    if (existsSync(path)) segments = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean)
      .map((line) => JSON.parse(line) as Segment).filter((segment) => segment.workflowRunId === executionId);
    if (segments.length >= 2) break;
    if (Date.now() >= deadline) throw new Error(`Expected two returned active segments; found ${segments.length}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  segments.sort((left, right) => left.startedEpochMs - right.startedEpochMs);
  const [park, resume] = segments;
  if (segments.length !== 2 || segments.some((segment) => segment.failure || segment.backend !== backend) ||
    (park.response?.result.status ?? park.result?.status) !== 'waiting' ||
    (resume.response?.result.status ?? resume.result?.status) !== 'completed') {
    throw new Error('Expected exactly one successful park and one successful resume on the selected backend');
  }
  if (!park.rpcCalls?.some((call) => call.name === 'ScopedAlertGraphSearch.search') ||
    !park.rpcCalls.some((call) => call.name === 'WorkflowStorage.scheduleResume') ||
    !resume.rpcCalls?.some((call) => call.name === 'WorkflowStorage.getSteps') ||
    resume.rpcCalls.filter((call) => call.name === 'CasesOperations.create').length !== 1 ||
    resume.rpcCalls.some((call) => call.name === 'ScopedAlertGraphSearch.search')) {
    throw new Error('Missing graph/park/saved-output-reload/Case callback placement evidence');
  }
  if (backend === 'fresh-faas') {
    if (!park.containerId || park.containerId === resume.containerId || !park.containerRemoved || !resume.containerRemoved ||
      !park.containerReleasedAtEpochMs || park.containerReleasedAtEpochMs > resume.startedEpochMs) {
      throw new Error('Fresh-container park/resume lifecycle was not established');
    }
    for (const segment of segments) {
      if (!segment.inspection) throw new Error('Missing Docker inspect evidence');
      const [inspection]: { HostConfig: { NanoCpus: number; Memory: number; MemorySwap: number }; Mounts: object[] }[] = JSON.parse(segment.inspection);
      if (inspection.Mounts.length || inspection.HostConfig.NanoCpus !== 1_000_000_000 ||
        ![128, 256, 512].includes(expectedMemoryMiB) || inspection.HostConfig.Memory !== expectedMemoryMiB * 1024 * 1024 ||
        inspection.HostConfig.MemorySwap !== inspection.HostConfig.Memory) throw new Error('Runner mounts/limits do not match the experiment');
      if (spawnSync('docker', ['inspect', segment.containerId ?? ''], { encoding: 'utf8' }).status === 0) throw new Error('Fresh executor container still exists');
    }
  }
  return segments;
}

async function main(): Promise<void> {
  if (command === 'config') {
    const backend = option('backend', 'fresh-faas');
    const memory = Number(option('memory', '128'));
    const rtt = Number(option('rtt', '0'));
    if (!['existing-worker', 'fresh-faas', 'warm-faas-control'].includes(backend) || ![128, 256, 512].includes(memory) || ![0, 1, 5, 10].includes(rtt)) throw new Error('Unsupported condition');
    const artifactPath = resolve(option('artifact', 'target/workflows_faas'));
    const manifest: { artifactHash: string } = JSON.parse(readFileSync(join(artifactPath, 'manifest.json'), 'utf8'));
    console.log(stringify({
      workflowsExecutionEngine: { remoteExecution: { enabled: true } },
      core: { remote: { backend: backend === 'existing-worker' ? 'worker_thread' : 'lambda_rie', faas: {
        artifactPath, expectedArtifactHash: manifest.artifactHash,
        image: option('image', 'kbn-workflows-faas:local'), memoryMiB: memory,
        warm: backend === 'warm-faas-control', addedRttMs: rtt,
        callbackHost: 'host.docker.internal', measurementPath: resolve(option('segments', 'target/faas_segments.jsonl')),
      } } },
    }));
    return;
  }
  const directory = resolve(option('out', 'target/faas_measurements'));
  mkdirSync(directory, { recursive: true });
  if (command === 'build-times') {
    const output = join(directory, `artifact-${Date.now()}`);
    for (const phase of ['clean-output', 'incremental-no-change']) {
      const start = performance.now();
      let stdout = ''; let failure: string | undefined;
      try { stdout = execFileSync(process.execPath, ['scripts/workflows_faas.js', output], { encoding: 'utf8' }); }
      catch (error) { failure = String(error); }
      append(join(directory, 'builds.jsonl'), { phase, wallMs: performance.now() - start, stdout, failure,
        inventory: existsSync(join(output, 'inventory.json')) ? JSON.parse(readFileSync(join(output, 'inventory.json'), 'utf8')) : null });
    }
    return;
  }
  if (command === 'freeze') {
    const { workflow, fixtures, mapping, alertIndex } = await snapshot();
    const path = join(directory, 'frozen.json');
    if (existsSync(path)) throw new Error('Frozen evidence exists; use a new output directory, never overwrite');
    const frozen: Frozen = { workflowId: workflow.id, yaml: workflow.yaml, definitionHash: hash(workflow.yaml), alertIndex, fixtureHash: hash({ fixtures, mapping }), fixtures, mapping };
    save(path, frozen);
    return;
  }
  if (command === 'run') {
    const frozen: Frozen = JSON.parse(readFileSync(join(directory, 'frozen.json'), 'utf8'));
    const snapshotNow = await snapshot();
    if (hash(snapshotNow.workflow.yaml) !== frozen.definitionHash || hash({ fixtures: snapshotNow.fixtures, mapping: snapshotNow.mapping }) !== frozen.fixtureHash) throw new Error('Workflow/fixture drift since freeze');
    const condition = option('condition');
    const samples = Number(option('samples', '5'));
    if (!Number.isInteger(samples) || samples < 1) throw new Error('samples must be a positive integer');
    const base = option('kibana', process.env.KIBANA_URL ?? 'http://localhost:5601');
    save(join(directory, `host-${Date.now()}.json`), { at: new Date().toISOString(), condition,
      node: process.version, host: hostname(), platform: platform(), release: release(), cpus: cpus(), totalmem: totalmem(),
      docker: docker('info', '--format', '{{json .}}'), version: docker('version', '--format', '{{json .}}'),
      gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      gitDiff: execFileSync('git', ['diff', '--stat'], { encoding: 'utf8' }), definitionHash: frozen.definitionHash, fixtureHash: frozen.fixtureHash,
    });
    let failedSamples = 0;
    for (let sample = 0; sample < samples; sample++) {
      const started = performance.now();
      const attemptId = `${Date.now()}-${sample}`;
      let executionId: string | undefined;
      let failure: string | undefined;
      try {
        const result = await api<{ workflowExecutionId: string }>(base, `/api/workflows/workflow/${encodeURIComponent(frozen.workflowId)}/run`, 'POST', { inputs: {} });
        executionId = result.workflowExecutionId;
        append(join(directory, 'attempts.jsonl'), { phase: 'started', condition, sample, attemptId, executionId, at: new Date().toISOString() });
        const deadline = Date.now() + 180_000;
        let execution: Execution;
        while (true) {
          execution = await api<Execution>(base, `/api/workflows/executions/${executionId}?includeOutput=true`);
          append(join(directory, 'polls.jsonl'), { attemptId, at: new Date().toISOString(), execution });
          if (['completed', 'failed', 'cancelled', 'timed_out'].includes(execution.status)) break;
          if (Date.now() > deadline) throw new Error('Execution polling timeout; execution may still have side effects');
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        save(join(directory, `${attemptId}-execution.json`), execution);
        if (execution.status !== 'completed') throw new Error(`Execution ended ${execution.status}`);
        const caseStepName = assertAnchor(snapshotNow.workflow)[2].name;
        const caseOutput = execution.stepExecutions?.find((step) => step.stepId === caseStepName)?.output;
        const caseId = (caseOutput?.case as JsonObject | undefined)?.id;
        let caseRecord: JsonObject | undefined;
        if (typeof caseId === 'string') {
          caseRecord = await api<JsonObject>(base, `/api/cases/${encodeURIComponent(caseId)}`);
          save(join(directory, `${attemptId}-case.json`), caseRecord);
        }
        const graphOutput = execution.stepExecutions?.find((step) => step.stepId === 'graph')?.output;
        const nodeCount = (graphOutput?.stats as JsonObject | undefined)?.nodes;
        if (execution.status === 'completed' && (typeof nodeCount !== 'number' || nodeCount < 1 || caseRecord?.title !== `Graph nodes ${nodeCount}`)) {
          throw new Error('Completed execution lacks persisted saved-graph-title Case evidence');
        }
        const expectedNames = assertAnchor(snapshotNow.workflow).map((step) => step.name);
        if (!expectedNames.every((name) => execution.stepExecutions?.some((step) => step.stepId === name && step.status === 'completed'))) {
          throw new Error('Missing completed persisted graph/pause/Case step records');
        }
        const pause = execution.stepExecutions?.find((step) => step.stepId === expectedNames[1]);
        if (!pause?.startedAt || !pause.finishedAt || Date.parse(pause.finishedAt) - Date.parse(pause.startedAt) < 6000) {
          throw new Error('Persisted pause was shorter than six seconds');
        }
        let segments: Segment[] | undefined;
        if (argv.includes('--verify-backend')) {
          segments = await verifySegments(executionId, option('segments'), option('verify-backend'), Number(option('memory', '128')));
          save(join(directory, `${attemptId}-verified-segments.json`), segments);
        }
        append(join(directory, 'attempts.jsonl'), { phase: 'finished' , condition, sample, attemptId, executionId,
          status: execution.status, endToEndMs: performance.now() - started, caseId, caseTitle: caseRecord?.title });
      } catch (error) {
        failure = String(error);
        append(join(directory, 'attempts.jsonl'), { phase: 'failed', condition, sample, attemptId, executionId, failure, elapsedMs: performance.now() - started });
      }
      // Continue to the next independent sample; never retry an execution or replay an RPC.
      if (failure) { failedSamples++; console.error(failure); }
    }
    if (failedSamples) throw new Error(`${failedSamples} independent sample(s) failed; raw attempts retained`);
    return;
  }
  if (command === 'summarize') {
    const records: Segment[] = readFileSync(option('segments'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)).filter((record) => record.workflowRunId);
    const groups = new Map<string, Segment[]>();
    for (const record of records) {
      const key = `${record.backend}/${record.condition ?? 'worker-unlimited-container'}/rtt+${record.addedRttMs}`;
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }
    const summary = [...groups].map(([condition, segments]) => {
      const successes = segments.filter((segment) => !segment.failure);
      const mean = (values: number[]): number | null => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
      return { condition, samples: segments.length, failures: segments.length - successes.length,
        workflowSamples: new Set(segments.map((segment) => segment.workflowRunId)).size,
        meanHostSegmentMs: mean(successes.map((segment) => segment.hostTotalMs)),
        meanExecutionMs: mean(successes.map((segment) => segment.response?.metrics.executionMs ?? segment.result?.metrics?.executionMs ?? NaN).filter(Number.isFinite)),
        segments: segments.map((segment) => ({
          workflowRunId: segment.workflowRunId, invocationId: segment.invocationId, artifactHash: segment.artifactHash,
          failure: segment.failure, status: segment.response?.result.status ?? segment.result?.status,
          rpcCount: segment.rpcCalls?.length ?? 0, rpcCalls: segment.rpcCalls,
          encodedTraffic: segment.traffic, launchMs: segment.launchMs,
        })),
      };
    });
    const workflows = new Map<string, Segment[]>();
    for (const segment of records) {
      if (segment.workflowRunId) workflows.set(segment.workflowRunId, [...(workflows.get(segment.workflowRunId) ?? []), segment]);
    }
    const timelines = [...workflows].map(([workflowRunId, segments]) => {
      segments.sort((left, right) => left.startedEpochMs - right.startedEpochMs);
      return { workflowRunId, segments: segments.map((segment, ordinal) => ({
        ordinal: ordinal + 1, invocationId: segment.invocationId, artifactHash: segment.artifactHash,
        startedEpochMs: segment.startedEpochMs, recordedAt: segment.at,
        status: segment.response?.result.status ?? segment.result?.status,
        parkToNextInvocationGapMs: ordinal + 1 < segments.length ? segments[ordinal + 1].startedEpochMs - Date.parse(segment.at) : null,
        intentionalPauseMs: (segment.response?.result.status ?? segment.result?.status) === 'waiting' ? 6000 : null,
        // Resume is scheduled before the first host invocation finishes. This is not exact TM dispatch latency.
        gapMinusSixSecondPauseEstimateMs: ordinal + 1 < segments.length ? segments[ordinal + 1].startedEpochMs - Date.parse(segment.at) - 6000 : null,
      })) };
    });
    save(join(directory, 'summary.json'), { summary, timelines, notes: [
      'Counts are initiated callback invocations, including unfinished calls on disconnect, not request+response seam records; session lookups/ping reported separately.',
      'Encoded bytes exclude TCP/IP framing; MessagePort strings are not native structured-clone wire bytes.',
      'Host segment time excludes durable wait/TM scheduling; use attempts/polls and both segment timestamps for end-to-end gap.',
      'Do not sum overlapping callback durations as critical-path RTT; retain ordered raw timings.',
    ] });
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  throw new Error('Commands: config | build-times | freeze | run | summarize (see faas/README.md)');
}
main().catch((error: Error) => { console.error(error); process.exitCode = 1; });
