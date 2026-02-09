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
import type { OpenAPISpec } from '../src/input/load_oas';

const TMP_DIR = resolve(__dirname, '../target/test-tmp');

const createOpenApiSpec = (
  pathsOverride?: Record<string, Record<string, unknown>>
): OpenAPISpec => ({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  paths: pathsOverride ?? {
    '/api/test': {
      get: {
        operationId: 'test',
        responses: { '200': { description: 'OK' } },
      },
    },
  },
});

const createNormalizedSpec = (
  pathsOverride?: Record<string, Record<string, { responses?: Record<string, unknown> }>>
): NormalizedSpec => ({
  paths: pathsOverride ?? {
    '/api/test': {
      get: {
        responses: { '200': { description: 'OK' } },
      },
    },
  },
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
    it('selects stack baseline using previous minor version', () => {
      const selection = selectBaseline('stack', '9.2.5');
      expect(selection.distribution).toBe('stack');
      // Compares against previous minor: 9.2.x → 9.1.yaml
      expect(selection.path).toContain('9.1.yaml');
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
      const normalizedSpec = createNormalizedSpec();
      await writeSpecFile(baselinePath, normalizedSpec);

      const baseline = await loadBaseline(baselinePath);
      expect(baseline).not.toBeNull();

      const openApiSpec = createOpenApiSpec();
      const currentNormalized = normalizeOas(openApiSpec);
      const diff = diffOas(baseline!, currentNormalized);
      const breakingChanges = filterBreakingChanges(diff);

      expect(breakingChanges).toEqual([]);
    });

    it('detects breaking changes when path removed', async () => {
      const baselinePath = resolve(TMP_DIR, 'baseline-removed.yaml');
      const baselineSpec = createNormalizedSpec({
        '/api/removed': {
          get: {
            responses: { '200': { description: 'OK' } },
          },
        },
      });
      await writeSpecFile(baselinePath, baselineSpec);

      const baseline = await loadBaseline(baselinePath);
      const currentSpec = createOpenApiSpec();
      const currentNormalized = normalizeOas(currentSpec);

      const diff = diffOas(baseline!, currentNormalized);
      const breakingChanges = filterBreakingChanges(diff);

      expect(breakingChanges.length).toBeGreaterThan(0);
      expect(breakingChanges[0].type).toBe('path_removed');
    });

    it('formats breaking changes correctly', async () => {
      const baselinePath = resolve(TMP_DIR, 'baseline-format.yaml');
      const baselineSpec = createNormalizedSpec({
        '/api/test': {
          get: {
            responses: { '200': { description: 'OK' } },
          },
          delete: {
            responses: { '204': { description: 'Deleted' } },
          },
        },
      });
      await writeSpecFile(baselinePath, baselineSpec);

      const baseline = await loadBaseline(baselinePath);
      const currentSpec = createOpenApiSpec(); // Only has GET, missing DELETE

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
      const baselineSpec = createNormalizedSpec();
      await writeSpecFile(baselinePath, baselineSpec);

      const baseline = await loadBaseline(baselinePath);
      const currentSpec = createOpenApiSpec({
        '/api/test': {
          get: {
            responses: { '200': { description: 'OK' } },
          },
        },
        '/api/new': {
          post: {
            responses: { '201': { description: 'Created' } },
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
