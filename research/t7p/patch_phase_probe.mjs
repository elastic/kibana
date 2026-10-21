/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Overlay the distribution's compiled probe with the phases kind.
 * The image was built before this measurement. Boot and run text stay in place.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const MEASURE = `const measureDispatchPhases = async (context)=>{
    const workerStart = performance.now();
    const reentryStart = performance.now();
    const current = await getIsland(context);
    const islandReentryMs = performance.now() - reentryStart;
    const decodeStart = performance.now();
    const snapshot = dataSnapshot(context);
    const snapshotDecodeMs = performance.now() - decodeStart;
    const replicaStart = performance.now();
    if (snapshot.replicas) current.applyReplicas({ replicas: snapshot.replicas });
    const replicaRefreshMs = performance.now() - replicaStart;
    const readinessStart = performance.now();
    if (snapshot.readiness) current.applyReplicas({ readiness: snapshot.readiness });
    const readinessMs = performance.now() - readinessStart;
    const bootBodyMs = performance.now() - workerStart;
    const parityStart = performance.now();
    const parityDiffs = (0, _research_runner_override.diffDefinitionParity)(snapshot.taskDefinitionMeta ?? [], current.taskDefinitionMeta);
    const definitionParityMs = performance.now() - parityStart;
    const workloadStart = performance.now();
    let workloadSetupMs = 0;
    let workloadType = null;
    let workloadNote = 'no alerting task definition';
    const definitions = current.taskCapture.definitions;
    workloadType = definitions.has('alerting:.es-query') ? 'alerting:.es-query' : [...definitions.keys()].find((type)=>type.startsWith('alerting:')) ?? null;
    const definition = workloadType ? definitions.get(workloadType) : undefined;
    if (definition) {
        try {
            definition.createTaskRunner({
                taskInstance: {
                    id: 't7p-phase-probe',
                    taskType: workloadType,
                    params: { alertId: 't7p-phase-probe', spaceId: 'default' },
                    state: {},
                    startedAt: null,
                    attempts: 0
                },
                signal: new AbortController().signal,
                executionUuid: 't7p-phase-probe',
                setCustomTaskRunEventFields: ()=>{}
            });
            workloadSetupMs = performance.now() - workloadStart;
            workloadNote = 'createTaskRunner only; run() not called';
        } catch (error) {
            workloadSetupMs = performance.now() - workloadStart;
            workloadNote = \`createTaskRunner threw: \${error instanceof Error ? error.message : String(error)}\`.slice(0, 300);
        }
    }
    const secondDecodeStart = performance.now();
    dataSnapshot(context);
    const secondDecodeMs = performance.now() - secondDecodeStart;
    const workerTotalMs = performance.now() - workerStart;
    return {
        bootMs: current.bootMs,
        waitedMs: bootBodyMs,
        phases: {
            islandReentryMs,
            snapshotDecodeMs,
            replicaRefreshMs,
            readinessMs,
            definitionParityMs,
            parityDiffs: parityDiffs.length,
            workloadSetupMs,
            workloadType,
            workloadNote,
            secondDecodeMs,
            bootBodyMs,
            workerTotalMs,
            soTypeCount: current.registeredSoTypes.length,
            fingerprintCount: Object.keys(snapshot.readiness?.fingerprints ?? {}).length
        }
    };
};
`;

export const patchEntry = (source) => {
  if (!source.includes("if (input.phase === 'boot')")) {
    throw new Error('entry boot anchor missing');
  }
  if (!source.includes('const runTask = async')) throw new Error('entry runTask anchor missing');
  let next = source;
  if (!next.includes('const measureDispatchPhases')) {
    next = next.replace('const runTask = async', `${MEASURE}const runTask = async`);
  }
  if (!next.includes("input.phase === 'phases'")) {
    next = next.replace(
      "if (input.phase === 'boot')",
      "if (input.phase === 'phases') {\n            return measureDispatchPhases(context);\n        }\n        if (input.phase === 'boot')"
    );
  }
  if (!next.includes("input.phase === 'boot'")) throw new Error('boot path was removed');
  return next;
};

export const patchMainHost = (source) => {
  const from = `kind === 'boot' ? {
            phase: 'boot',
            taskType: 'boot',
            taskInstance: {}
        } : {
            phase: 'stats',
            taskType: kind,
            taskInstance: {}
        }`;
  const to = `{
            phase: kind === 'boot' ? 'boot' : kind === 'phases' ? 'phases' : 'stats',
            taskType: kind === 'boot' ? 'boot' : kind,
            taskInstance: {}
        }`;
  if (source.includes("kind === 'phases' ? 'phases'")) return source;
  if (!source.includes(from)) throw new Error('main_host probe anchor missing');
  return source.replace(from, to);
};

export const patchRoutes = (source) => {
  if (source.includes("schema.literal('phases')") || source.includes("literal('phases')")) {
    return source;
  }
  const anchor = "_configschema.schema.literal('platform-watch')";
  if (!source.includes(anchor)) throw new Error('routes anchor missing');
  return source.replace(
    anchor,
    `${anchor},\n                    _configschema.schema.literal('phases')`
  );
};

/** Same cache as policies.ts: hash once per generation, expected fingerprint, and type object. */
export const patchPolicies = (source) => {
  if (source.includes('const readinessCache = new Map()')) return source;
  const start = source.indexOf('const verifyRegistryReadiness = (token, registered)=>');
  const end = source.indexOf('const SECRET_KEY', start);
  if (start < 0 || end < 0) throw new Error('policies anchor missing');
  const body = `const readinessCache = new Map();
const verifyRegistryReadiness = (token, registered)=>{
    if (!token || !Number.isInteger(token.generation) || token.generation < 1) {
        throw new Error('worker-core readiness token missing');
    }
    if (registered.length === 0) return;
    for (const type of registered){
        const expected = token.fingerprints[type.name];
        const cached = readinessCache.get(type.name);
        if (cached && cached.generation === token.generation && cached.expected === expected && cached.type === type) continue;
        const actual = fingerprintSavedObjectType(type);
        if (expected !== actual) {
            readinessCache.delete(type.name);
            throw new Error('worker-core readiness mismatch for saved object type ' + type.name);
        }
        readinessCache.set(type.name, {
            generation: token.generation,
            expected,
            type
        });
    }
};
`;
  return source.slice(0, start) + body + source.slice(end);
};

/** Child argv cap. Unset env leaves the fork call unchanged. */
export const patchTransport = (source) => {
  if (source.includes('T7P_PROCESS_OLD_SPACE_MB')) return source;
  const from = `const child = (0, _child_process.fork)(entry, [], {
        serialization: 'advanced',
        stdio: [
            'ignore',
            'ignore',
            'ignore',
            'ipc'
        ]
    });`;
  const to = `const oldSpace = process.env.T7P_PROCESS_OLD_SPACE_MB;
    const forkOptions = {
        serialization: 'advanced',
        stdio: [
            'ignore',
            'ignore',
            'ignore',
            'ipc'
        ]
    };
    if (/^[1-9]\\d{0,4}$/.test(oldSpace || '')) {
        forkOptions.execArgv = process.execArgv.filter((arg)=>!String(arg).includes('max-old-space-size')).concat('--max-old-space-size=' + oldSpace);
        forkOptions.env = {
            ...process.env
        };
        if (typeof forkOptions.env.NODE_OPTIONS === 'string') {
            forkOptions.env.NODE_OPTIONS = forkOptions.env.NODE_OPTIONS.replace(/--max-old-space-size(?:=|\\s+)\\d+/g, '').trim();
        }
    }
    const child = (0, _child_process.fork)(entry, [], forkOptions);`;
  if (!source.includes(from)) throw new Error('transport fork anchor missing');
  return source.replace(from, to);
};

export const patchMemory = (source) => {
  if (source.includes('heapSizeLimit:')) return source;
  const from = 'pointerCompression: variables?.v8_enable_pointer_compression === 1';
  if (!source.includes(from)) throw new Error('memory sample anchor missing');
  return source.replace(
    from,
    'heapSizeLimit: heap.heap_size_limit,\n        pointerCompression: variables?.v8_enable_pointer_compression === 1'
  );
};

const isMain = process.argv[1] && process.argv[1].endsWith('patch_phase_probe.mjs');
if (isMain) {
  const root = new URL(
    '../../build/kibana/node_modules/@kbn/workload-isolation-research-plugin/server/t7a/',
    import.meta.url
  );
  const outDir = process.argv[2];
  if (!outDir) throw new Error('output directory required');
  mkdirSync(outDir, { recursive: true });
  const kit = new URL('../capability_kit/', root);
  const entry = patchEntry(readFileSync(new URL('isolate/entry.js', root), 'utf8'));
  const host = patchMainHost(readFileSync(new URL('main_host.js', root), 'utf8'));
  const routes = patchRoutes(readFileSync(new URL('routes.js', root), 'utf8'));
  const policies = patchPolicies(readFileSync(new URL('worker_core/policies.js', kit), 'utf8'));
  const transport = patchTransport(readFileSync(new URL('transport.js', kit), 'utf8'));
  const memory = patchMemory(readFileSync(new URL('worker_core/memory_sample.js', kit), 'utf8'));
  writeFileSync(`${outDir}/entry.js`, entry);
  writeFileSync(`${outDir}/main_host.js`, host);
  writeFileSync(`${outDir}/routes.js`, routes);
  writeFileSync(`${outDir}/policies.js`, policies);
  writeFileSync(`${outDir}/transport.js`, transport);
  writeFileSync(`${outDir}/memory_sample.js`, memory);
  mkdirSync(dirname(`${outDir}/entry.js`), { recursive: true });
}
