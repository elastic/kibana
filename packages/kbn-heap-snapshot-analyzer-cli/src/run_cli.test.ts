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

describe('heap snapshot graph analysis', () => {
  it('handles a diamond, ignores weak edges, and reconciles exclusive attribution', () => {
    const directory = mkdtempSync(join(tmpdir(), 'kbn-heap-analyzer-test-'));
    try {
      // root -> zod and joi; both -> shared; zod -> child.
      // joi's weak edge to child must not change its dominator.
      const snapshot = {
        snapshot: {
          meta: {
            node_fields: ['type', 'name', 'id', 'self_size', 'edge_count'],
            node_types: [['synthetic', 'object'], 'string', 'number', 'number', 'number'],
            edge_fields: ['type', 'name_or_index', 'to_node'],
            edge_types: [['property', 'weak'], 'string', 'node'],
          },
          node_count: 5,
          edge_count: 6,
        },
        nodes: [
          0,
          0,
          1,
          0,
          2, // root
          1,
          1,
          2,
          10,
          2, // zod
          1,
          2,
          3,
          20,
          2, // joi
          1,
          3,
          4,
          30,
          0, // shared
          1,
          4,
          5,
          40,
          0, // child
        ],
        edges: [
          0,
          5,
          5,
          0,
          5,
          10, // root -> zod, joi
          0,
          5,
          15,
          0,
          5,
          20, // zod -> shared, child
          0,
          5,
          15,
          1,
          5,
          20, // joi -> shared, weak child
        ],
        strings: [
          'root',
          'node_modules/zod/index.js',
          'node_modules/joi/index.js',
          'shared',
          'child',
          'edge',
        ],
      };
      const input = join(directory, 'fixture.heapsnapshot');
      const output = join(directory, 'report.json');
      writeFileSync(input, JSON.stringify(snapshot));

      execFileSync(
        process.execPath,
        [
          join(REPO_ROOT, 'scripts/heap_snapshot_analyzer.js'),
          input,
          '--counterfactual=2',
          `--json=${output}`,
        ],
        { cwd: REPO_ROOT, stdio: 'pipe' }
      );
      const report = JSON.parse(readFileSync(output, 'utf8'));
      const zod = report.packages.find(({ package: name }: { package: string }) => name === 'zod');
      const joi = report.packages.find(({ package: name }: { package: string }) => name === 'joi');

      expect(report.totalSelf).toBe(100);
      expect(report.rootRetained).toBe(100);
      expect(zod).toMatchObject({ retainedBytes: 50, savedBytes: 50 });
      expect(joi).toMatchObject({ retainedBytes: 20, savedBytes: 20 });
      expect(report.unattributed.package.retainedBytes).toBe(30);
      expect(
        report.packages.reduce(
          (sum: number, row: { retainedBytes: number }) => sum + row.retainedBytes,
          0
        ) + report.unattributed.package.retainedBytes
      ).toBe(100);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('attributes tracked library allocations to the allocator and its Kibana caller', () => {
    const directory = mkdtempSync(join(tmpdir(), 'kbn-heap-alloc-test-'));
    try {
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
        nodes: [0, 0, 1, 0, 1, 0, 1, 0, 2, 100, 0, 3],
        edges: [0, 3, 6],
        trace_function_infos: [0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 2, 0, 1, 0, 0, 0],
        trace_tree: [1, 0, 0, 0, [2, 1, 0, 0, [3, 2, 0, 0, []]]],
        strings: ['root', 'node_modules/zod/index.js', '@kbn/config-schema/index.js', 'edge'],
      };
      const input = join(directory, 'tracked.heapsnapshot');
      writeFileSync(input, JSON.stringify(snapshot));

      const run = (filter?: string) => {
        const output = join(directory, filter ? 'filtered.json' : 'unfiltered.json');
        execFileSync(
          process.execPath,
          [
            join(REPO_ROOT, 'scripts/heap_snapshot_analyzer.js'),
            input,
            '--no-counterfactual',
            ...(filter ? [`--filter=${filter}`] : []),
            `--json=${output}`,
          ],
          { cwd: REPO_ROOT, stdio: 'pipe' }
        );
        return JSON.parse(readFileSync(output, 'utf8'));
      };

      const unfiltered = run();
      expect(unfiltered.hasAllocationTracking).toBe(true);
      expect(unfiltered.modulesAlloc).toContainEqual(
        expect.objectContaining({ package: 'zod', allocBytes: 100 })
      );
      expect(unfiltered.packagesAlloc).toContainEqual(
        expect.objectContaining({ package: '@kbn/config-schema', allocBytes: 100 })
      );

      const filtered = run('zod');
      expect(filtered.modulesAlloc).toContainEqual(
        expect.objectContaining({ package: '@kbn/config-schema', allocBytes: 100 })
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
