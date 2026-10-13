/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

assert.equal(process.version, 'v24.21.0', 'Use Kibana Node 24.21.0');
const headers = resolve(process.argv[2] ?? join(dirname(process.execPath), '../include/node'));
const output = resolve(process.argv[3] ?? 'data/event_loop_native');
const { variables } = JSON.parse(
  readFileSync(join(headers, 'config.gypi'), 'utf8').replace(/^#.*$/gm, '')
);
const headerVersion = readFileSync(join(headers, 'node_version.h'), 'utf8');
assert.match(headerVersion, /#define NODE_MAJOR_VERSION 24\b/);
assert.match(headerVersion, /#define NODE_MINOR_VERSION 21\b/);
assert.match(headerVersion, /#define NODE_PATCH_VERSION 0\b/);
assert.equal(variables.target_arch, process.arch);
assert.equal(Number(variables.node_module_version), Number(process.versions.modules));
const runtimeVariables = process.config.variables as Readonly<
  Record<string, string | number | boolean>
>;
for (const [name, value] of Object.entries(variables)) {
  if (name.startsWith('v8_enable_')) {
    assert.equal(runtimeVariables[name], value, 'Header/runtime ABI mismatch: ' + name);
  }
}
const pc = Number(variables.v8_enable_pointer_compression) === 1;
const sandbox = Number(variables.v8_enable_sandbox) === 1;
const defines = ['BUILDING_NODE_EXTENSION', 'V8_DEPRECATION_WARNINGS'];
if (pc) defines.push('V8_COMPRESS_POINTERS');
if (pc && Number(variables.v8_enable_pointer_compression_shared_cage) !== 1) {
  defines.push('V8_COMPRESS_POINTERS_IN_MULTIPLE_CAGES');
}
if (Number(variables.v8_enable_pointer_compression_shared_cage) === 1) {
  defines.push('V8_COMPRESS_POINTERS_IN_SHARED_CAGE');
}
if (pc || Number(variables.v8_enable_31bit_smis_on_64bit_arch) === 1) {
  defines.push('V8_31BIT_SMIS_ON_64BIT_ARCH');
}
if (sandbox) defines.push('V8_ENABLE_SANDBOX');
for (const [variable, define] of [
  ['v8_enable_v8_checks', 'V8_ENABLE_CHECKS'],
  ['v8_enable_zone_compression', 'V8_COMPRESS_ZONES'],
  ['v8_enable_external_code_space', 'V8_EXTERNAL_CODE_SPACE'],
]) {
  if (Number(variables[variable]) === 1) defines.push(define);
}
mkdirSync(output, { recursive: true });
const source = join(dirname(fileURLToPath(import.meta.url)), 'profiler.cc');
const binary = join(output, 'profiler.node');
const args = [
  '-std=c++20',
  '-O2',
  '-fPIC',
  '-pthread',
  '-Wall',
  '-Wextra',
  '-Wno-unused-parameter',
  '-I',
  headers,
  ...defines.map((name) => '-D' + name),
  ...(process.platform === 'darwin' ? ['-bundle', '-undefined', 'dynamic_lookup'] : ['-shared']),
  source,
  '-o',
  binary,
];
const compiler = process.env.CXX ?? 'c++';
const result = spawnSync(compiler, args, { stdio: 'inherit' });
if (result.status !== 0) throw new Error('Native build failed');
writeFileSync(
  binary + '.json',
  JSON.stringify(
    {
      node: process.version,
      modules: process.versions.modules,
      v8: process.versions.v8,
      abiVariables: Object.fromEntries(
        Object.entries(variables).filter(([name]) => name.startsWith('v8_enable_'))
      ),
      platform: process.platform,
      arch: process.arch,
      pointerCompression: pc,
      sandbox,
      headers,
      compiler,
      args,
    },
    null,
    2
  ) + '\n'
);
process.stdout.write(binary + '\n');
