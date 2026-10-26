/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const analyze = (snapshot: object, flags: string[]) => {
  const directory = mkdtempSync(join(tmpdir(), 'kbn-heap-analyzer-test-'));
  try {
    const input = join(directory, 'fixture.heapsnapshot');
    const output = join(directory, 'report.json');
    writeFileSync(input, JSON.stringify(snapshot));
    execFileSync(
      process.execPath,
      [join(REPO_ROOT, 'scripts/heap_snapshot_analyzer.js'), input, ...flags, `--json=${output}`],
      { cwd: REPO_ROOT, stdio: 'pipe' }
    );
    return JSON.parse(readFileSync(output, 'utf8'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe('heap snapshot analyzer', () => {
  it('keeps nested retained bytes on the holder and reports only unowned bytes as unattributed', () => {
    // root -> zod (10) -> joi (20) -> child (30)
    // root -> shared (40), no package evidence
    const report = analyze(
      {
        snapshot: {
          meta: {
            node_fields: ['type', 'name', 'id', 'self_size', 'edge_count'],
            node_types: [['synthetic', 'object'], 'string', 'number', 'number', 'number'],
            edge_fields: ['type', 'name_or_index', 'to_node'],
            edge_types: [['property', 'weak'], 'string', 'node'],
          },
          node_count: 5,
          edge_count: 4,
        },
        // prettier-ignore
        nodes: [
          0, 0, 1, 0, 2, // root
          1, 1, 2, 10, 1, // zod
          1, 2, 3, 20, 1, // joi
          1, 3, 4, 30, 0, // child
          1, 4, 5, 40, 0, // shared
        ],
        // prettier-ignore
        edges: [
          0, 5, 5, // root -> zod
          0, 5, 20, // root -> shared
          0, 5, 10, // zod -> joi
          0, 5, 15, // joi -> child
        ],
        strings: [
          'root',
          'node_modules/zod/index.js',
          'node_modules/joi/index.js',
          'child',
          'shared',
          'edge',
        ],
      },
      ['--counterfactual=2']
    );
    const row = (name: string) =>
      report.packages.find(({ package: pkg }: { package: string }) => pkg === name);

    expect(report.rootRetained).toBe(100);
    // Retained is inclusive: zod keeps joi and child alive.
    expect(row('zod')).toMatchObject({ retainedBytes: 60, savedBytes: 60 });
    expect(row('joi')).toMatchObject({ retainedBytes: 50, savedBytes: 50 });
    // Only `shared` (and the zero-size root) has no owner.
    expect(report.unattributed.package.retainedBytes).toBe(40);
    // No plugins in this snapshot, so the plugin view owns nothing.
    expect(report.unattributed.plugins.retainedBytes).toBe(100);
  });

  it('reports Kibana package frames in the module allocation table', () => {
    // A zod allocation called from @kbn/config-schema.
    const snapshot = {
      snapshot: {
        meta: {
          node_fields: ['type', 'name', 'id', 'self_size', 'edge_count', 'trace_node_id'],
          node_types: [['synthetic', 'object'], 'string', 'number', 'number', 'number', 'number'],
          edge_fields: ['type', 'name_or_index', 'to_node'],
          edge_types: [['property', 'weak'], 'string', 'node'],
          trace_function_info_fields: [
            'function_id',
            'name',
            'script_name',
            'script_id',
            'line',
            'column',
          ],
        },
        node_count: 2,
        edge_count: 1,
      },
      // prettier-ignore
      nodes: [
        0, 0, 1, 0, 1, 0, // root
        1, 0, 2, 100, 0, 3, // allocated object, trace node 3
      ],
      edges: [0, 3, 6],
      // prettier-ignore
      trace_function_infos: [
        0, 0, 0, 0, 0, 0,
        1, 0, 2, 0, 0, 0, // @kbn/config-schema
        2, 0, 1, 0, 0, 0, // zod
      ],
      trace_tree: [1, 0, 0, 0, [2, 1, 0, 0, [3, 2, 0, 0, []]]],
      strings: ['root', 'node_modules/zod/index.js', '@kbn/config-schema/index.js', 'edge'],
    };

    const unfiltered = analyze(snapshot, ['--no-counterfactual']);
    expect(unfiltered.modulesAlloc).toEqual([
      expect.objectContaining({ package: 'zod', allocBytes: 100 }),
    ]);
    expect(unfiltered.packagesAlloc).toEqual([
      expect.objectContaining({ package: '@kbn/config-schema', allocBytes: 100 }),
    ]);

    // --filter=zod walks past zod frames to the Kibana caller. Previously the
    // module table dropped these bytes entirely.
    const filtered = analyze(snapshot, ['--no-counterfactual', '--filter=zod']);
    expect(filtered.modulesAlloc).toEqual([
      expect.objectContaining({ package: '@kbn/config-schema', allocBytes: 100 }),
    ]);
  });
});
