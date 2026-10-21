/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  patchEntry,
  patchMainHost,
  patchMemory,
  patchPolicies,
  patchRoutes,
  patchTransport,
} from './patch_phase_probe.mjs';

const root = fileURLToPath(
  new URL(
    '../../build/kibana/node_modules/@kbn/workload-isolation-research-plugin/server/t7a/',
    import.meta.url
  )
);

const check = (name, source) => {
  const dir = mkdtempSync(join(tmpdir(), 't7p-phase-'));
  const file = join(dir, name);
  writeFileSync(file, source);
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
};

test('phase overlay keeps boot and parses', () => {
  const entry = patchEntry(readFileSync(join(root, 'isolate/entry.js'), 'utf8'));
  assert.match(entry, /input\.phase === 'phases'/);
  assert.match(entry, /input\.phase === 'boot'/);
  assert.match(entry, /createTaskRunner only/);
  check('entry.js', entry);
  const host = patchMainHost(readFileSync(join(root, 'main_host.js'), 'utf8'));
  assert.match(host, /kind === 'phases' \? 'phases' : 'stats'/);
  check('main_host.js', host);
  const routes = patchRoutes(readFileSync(join(root, 'routes.js'), 'utf8'));
  assert.match(routes, /literal\('phases'\)/);
  assert.match(routes, /literal\('boot'\)/);
  check('routes.js', routes);
});

test('readiness overlay caches a generation and still parses', () => {
  const kit = fileURLToPath(
    new URL(
      '../../build/kibana/node_modules/@kbn/workload-isolation-research-plugin/server/capability_kit/',
      import.meta.url
    )
  );
  const policies = patchPolicies(readFileSync(join(kit, 'worker_core/policies.js'), 'utf8'));
  assert.match(policies, /readinessCache/);
  assert.match(policies, /cached\.type === type/);
  assert.doesNotMatch(policies, /cached[\s\S]{0,180}type\.mappings/);
  check('policies.js', policies);
  const transport = patchTransport(readFileSync(join(kit, 'transport.js'), 'utf8'));
  assert.match(transport, /T7P_PROCESS_OLD_SPACE_MB/);
  assert.match(transport, /forkOptions/);
  check('transport.js', transport);
  const memory = patchMemory(readFileSync(join(kit, 'worker_core/memory_sample.js'), 'utf8'));
  assert.match(memory, /heapSizeLimit: heap\.heap_size_limit/);
  check('memory_sample.js', memory);
});
