/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dump, load } from 'js-yaml';
import { selectBaseline } from '../src/baseline/select_baseline';
import { normalizeOas } from '../src/input/normalize_oas';
import type { NormalizedSpec } from '../src/input/normalize_oas';

const TMP_DIR = resolve(__dirname, '../target/test-tmp-update');

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

describe('update_baseline integration', () => {
  beforeEach(async () => {
    if (existsSync(TMP_DIR)) {
      await rm(TMP_DIR, { recursive: true, force: true });
    }
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TMP_DIR)) {
      await rm(TMP_DIR, { recursive: true, force: true });
    }
  });

  describe('baseline path selection', () => {
    it('selects serverless baseline path', () => {
      const selection = selectBaseline('serverless');
      expect(selection.path).toContain('serverless/current.yaml');
    });

    it('selects stack baseline path with major.minor version', () => {
      const selection = selectBaseline('stack', '9.2.5');
      expect(selection.path).toContain('9.2.yaml');
    });

    it('extracts major.minor from full semver', () => {
      const selection = selectBaseline('stack', '8.19.3');
      expect(selection.path).toContain('8.19.yaml');
    });

    it('handles SNAPSHOT suffix', () => {
      const selection = selectBaseline('stack', '9.3.0-SNAPSHOT');
      expect(selection.path).toContain('9.3.yaml');
    });

    it('requires version for stack distribution', () => {
      expect(() => selectBaseline('stack')).toThrow('Version is required for stack');
    });

    it('validates semver format', () => {
      expect(() => selectBaseline('stack', 'not-a-version')).toThrow('Invalid semver');
    });
  });

  describe('normalization workflow', () => {
    it('normalizes spec by removing descriptions', () => {
      const spec = createSpec({
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'This should be removed',
        },
        paths: {
          '/api/test': {
            get: {
              operationId: 'test',
              description: 'Get operation description',
              summary: 'Get summary',
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      });

      const normalized = normalizeOas(spec);

      // Normalization strips everything except paths and operation details
      expect(normalized.paths).toBeDefined();
      expect('description' in normalized.paths['/api/test'].get!).toBe(false);
      expect('summary' in normalized.paths['/api/test'].get!).toBe(false);
      expect(normalized.paths['/api/test'].get!.parameters).toBeUndefined();
      expect(normalized.paths['/api/test'].get!.responses).toBeDefined();
    });

    it('writes normalized baseline to file', async () => {
      const outputPath = resolve(TMP_DIR, 'baseline.yaml');
      const spec = createSpec({
        info: {
          title: 'Test',
          version: '1.0.0',
          description: 'Remove this',
        },
      });

      const normalized = normalizeOas(spec);
      await mkdir(resolve(outputPath, '..'), { recursive: true });
      await writeFile(outputPath, dump(normalized), 'utf-8');

      expect(existsSync(outputPath)).toBe(true);

      const content = await readFile(outputPath, 'utf-8');
      const loaded = load(content) as any;

      // Normalized specs only contain paths
      expect(loaded.paths).toBeDefined();
      expect(loaded.paths['/api/test']).toBeDefined();
      expect(loaded.paths['/api/test'].get).toBeDefined();
    });

    it('creates directory structure if needed', async () => {
      const outputPath = resolve(TMP_DIR, 'nested/deep/baseline.yaml');
      const spec = createSpec();
      const normalized = normalizeOas(spec);

      await mkdir(resolve(outputPath, '..'), { recursive: true });
      await writeFile(outputPath, dump(normalized), 'utf-8');

      expect(existsSync(outputPath)).toBe(true);
    });
  });

  describe('version extraction logic', () => {
    it('extracts minor version correctly', () => {
      const testCases = [
        { input: '9.2.0', expected: '9.2' },
        { input: '9.2.5', expected: '9.2' },
        { input: '8.19.0', expected: '8.19' },
        { input: '10.0.1', expected: '10.0' },
      ];

      testCases.forEach(({ input, expected }) => {
        const selection = selectBaseline('stack', input);
        expect(selection.path).toContain(`${expected}.yaml`);
      });
    });

    it('handles pre-release versions', () => {
      const testCases = ['9.2.0-SNAPSHOT', '9.2.0-alpha.1', '9.2.0-beta.2', '9.2.0-rc.1'];

      testCases.forEach((version) => {
        const selection = selectBaseline('stack', version);
        expect(selection.path).toContain('9.2.yaml');
      });
    });
  });
});
