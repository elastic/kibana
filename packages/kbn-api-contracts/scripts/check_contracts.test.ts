/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { dump } from 'js-yaml';
import { selectBaseline } from '../src/baseline/select_baseline';
import { loadBaseline } from '../src/baseline/load_baseline';
import { normalizeOas } from '../src/input/normalize_oas';
import { diffOas } from '../src/diff/diff_oas';
import { filterBreakingChanges } from '../src/diff/breaking_rules';
import { formatFailure } from '../src/report/format_failure';
import type { NormalizedSpec } from '../src/input/normalize_oas';

const TMP_DIR = resolve(__dirname, '../target/test-tmp');

const createSpec = (overrides: Partial<NormalizedSpec> = {}): NormalizedSpec => ({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  paths: {
    '/api/test': {
      get: {
        operationId: 'test',
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  ...overrides,
});

const writeSpecFile = async (path: string, spec: NormalizedSpec) => {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, dump(spec), 'utf-8');
};

describe('check_contracts integration', () => {
  beforeAll(async () => {
    if (existsSync(TMP_DIR)) {
      await rm(TMP_DIR, { recursive: true, force: true });
    }
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    if (existsSync(TMP_DIR)) {
      await rm(TMP_DIR, { recursive: true, force: true });
    }
  });

  describe('baseline selection', () => {
    it('selects stack baseline with minor version', () => {
      const selection = selectBaseline('stack', '9.2.5');
      expect(selection.distribution).toBe('stack');
      expect(selection.path).toContain('9.2.yaml');
    });

    it('selects serverless baseline', () => {
      const selection = selectBaseline('serverless');
      expect(selection.distribution).toBe('serverless');
      expect(selection.path).toContain('serverless/current.yaml');
    });

    it('uses override path when provided', () => {
      const overridePath = '/custom/baseline.yaml';
      const selection = selectBaseline('stack', '9.2.0', overridePath);
      expect(selection.path).toBe(overridePath);
    });

    it('throws when version missing for stack', () => {
      expect(() => selectBaseline('stack')).toThrow('Version is required for stack');
    });

    it('throws on invalid semver', () => {
      expect(() => selectBaseline('stack', 'not-a-version')).toThrow('Invalid semver');
    });
  });

  describe('full workflow', () => {
    it('detects no breaking changes when specs match', async () => {
      const baselinePath = resolve(TMP_DIR, 'baseline-match.yaml');
      const spec = createSpec();
      await writeSpecFile(baselinePath, spec);

      const baseline = await loadBaseline(baselinePath);
      expect(baseline).not.toBeNull();

      const currentNormalized = normalizeOas(spec);
      const diff = diffOas(baseline!, currentNormalized);
      const breakingChanges = filterBreakingChanges(diff);

      expect(breakingChanges).toEqual([]);
    });

    it('detects breaking changes when path removed', async () => {
      const baselinePath = resolve(TMP_DIR, 'baseline-removed.yaml');
      const baselineSpec = createSpec({
        paths: {
          '/api/removed': {
            get: {
              operationId: 'removed',
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      });
      await writeSpecFile(baselinePath, baselineSpec);

      const baseline = await loadBaseline(baselinePath);
      const currentSpec = createSpec();
      const currentNormalized = normalizeOas(currentSpec);

      const diff = diffOas(baseline!, currentNormalized);
      const breakingChanges = filterBreakingChanges(diff);

      expect(breakingChanges.length).toBeGreaterThan(0);
      expect(breakingChanges[0].type).toBe('path_removed');
    });

    it('formats breaking changes correctly', async () => {
      const baselinePath = resolve(TMP_DIR, 'baseline-format.yaml');
      const baselineSpec = createSpec({
        paths: {
          '/api/test': {
            get: {
              operationId: 'test',
              responses: { '200': { description: 'OK' } },
            },
            delete: {
              operationId: 'delete',
              responses: { '204': { description: 'Deleted' } },
            },
          },
        },
      });
      await writeSpecFile(baselinePath, baselineSpec);

      const baseline = await loadBaseline(baselinePath);
      const currentSpec = createSpec(); // Only has GET, missing DELETE

      const diff = diffOas(baseline!, normalizeOas(currentSpec));
      const breakingChanges = filterBreakingChanges(diff);

      const report = formatFailure(breakingChanges);
      expect(report).toContain('BREAKING CHANGES DETECTED');
      expect(report).toContain('HTTP method removed');
      expect(report).toContain('/api/test');
      expect(report).toContain('DELETE');
    });

    it('allows non-breaking additions', async () => {
      const baselinePath = resolve(TMP_DIR, 'baseline-addition.yaml');
      const baselineSpec = createSpec();
      await writeSpecFile(baselinePath, baselineSpec);

      const baseline = await loadBaseline(baselinePath);
      const currentSpec = createSpec({
        paths: {
          '/api/test': {
            get: {
              operationId: 'test',
              responses: { '200': { description: 'OK' } },
            },
          },
          '/api/new': {
            post: {
              operationId: 'newOp',
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      });

      const diff = diffOas(baseline!, normalizeOas(currentSpec));
      const breakingChanges = filterBreakingChanges(diff);

      expect(breakingChanges).toEqual([]);
    });

    it('handles missing baseline gracefully', async () => {
      const nonexistent = resolve(TMP_DIR, 'does-not-exist.yaml');
      const baseline = await loadBaseline(nonexistent);
      expect(baseline).toBeNull();
    });
  });
});
