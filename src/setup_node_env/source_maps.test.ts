/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { createStackTraceResolver } from './source_maps';

describe('createStackTraceResolver', () => {
  let tmpDir: string;
  let kibanaDir: string;

  beforeEach(() => {
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'resolve-stack-trace-'));
    kibanaDir = Path.join(tmpDir, 'kibana');
    const map = JSON.stringify({ version: 3, sources: ['src/a.ts'], names: [], mappings: 'AAEI' });
    for (const file of [
      'kibana/node_modules/@kbn/a/a.js.map',
      'kibana/target/public/bundles/chunks/b.js.map',
      'kibana/node_modules/@kbn/ui-shared-deps-npm/shared_built_assets/c.js.map',
      'outside/d.js.map',
    ]) {
      Fs.mkdirSync(Path.dirname(Path.join(tmpDir, file)), { recursive: true });
      Fs.writeFileSync(Path.join(tmpDir, file), map);
    }
  });

  afterEach(() => Fs.rmSync(tmpDir, { recursive: true, force: true }));

  it('resolves the locations of server files and browser bundles that have source maps', () => {
    const trace = [
      'Error: problem',
      '    at fail (/usr/share/kibana/node_modules/@kbn/a/a.js:1:1)',
      '    at C:\\kibana\\node_modules\\@kbn\\a\\a.js:1:1',
      '    at render (https://kibana.example/s/space/90210/bundles/chunks/b.js:1:1)',
      'render@https://kibana.example/90210/bundles/chunks/b.js:1:1',
      '    at react (https://kibana.example/90210/bundles/kbn-ui-shared-deps-npm/c.js:1:1)',
      '    at other (/usr/share/kibana/node_modules/@kbn/b/b.js:1:1)',
      '    at outside (/usr/share/kibana/node_modules/@kbn/../../../outside/d.js:1:1)',
      '    at lodash (/usr/share/kibana/node_modules/lodash/lodash.js:1:1)',
      '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)',
    ];

    expect(createStackTraceResolver(kibanaDir)(trace.join('\n')).split('\n')).toEqual([
      'Error: problem',
      '    at fail (src/a.ts:3:5)',
      '    at src/a.ts:3:5',
      '    at render (src/a.ts:3:5)',
      'render@src/a.ts:3:5',
      '    at react (src/a.ts:3:5)',
      ...trace.slice(6),
    ]);
  });

  it('resolves locations in JSON, keeping its syntax', () => {
    const log = JSON.stringify({
      stack: 'Error: problem\n    at C:\\kibana\\node_modules\\@kbn\\a\\a.js:1:1',
      file: '/usr/share/kibana/node_modules/@kbn/a/a.js:1:1',
    });

    expect(createStackTraceResolver(kibanaDir)(log)).toBe(
      JSON.stringify({ stack: 'Error: problem\n    at src/a.ts:3:5', file: 'src/a.ts:3:5' })
    );
  });
});
