/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ScoutTestTarget } from '@kbn/scout-info';
import {
  ScoutTestConfigStats,
  ScoutTestConfigStatsDataSchema,
  ScoutTestConfigStatsEntrySchema,
} from './test_config';

describe('ScoutTestConfigStatsEntrySchema', () => {
  it('transforms test_target into a ScoutTestTarget instance', () => {
    const parsed = ScoutTestConfigStatsEntrySchema.parse({
      path: 'some/config.ts',
      test_target: { location: 'local', arch: 'stateful', domain: 'classic' },
      runCount: 5,
      runtime: { avg: 100, median: 100, pc95th: 100, pc99th: 100, max: 100, estimate: 100 },
    });

    expect(parsed.test_target).toBeInstanceOf(ScoutTestTarget);
    expect(parsed.test_target.location).toBe('local');
    expect(parsed.test_target.arch).toBe('stateful');
    expect(parsed.test_target.domain).toBe('classic');
  });

  it('defaults target_attributes to an empty list', () => {
    const parsed = ScoutTestConfigStatsEntrySchema.parse({
      path: 'some/config.ts',
      test_target: { location: 'local', arch: 'stateful', domain: 'classic' },
      runCount: 5,
      runtime: { avg: 100, median: 100, pc95th: 100, pc99th: 100, max: 100, estimate: 100 },
    });

    expect(parsed.target_attributes).toEqual([]);
  });

  it('keeps declared target_attributes', () => {
    const parsed = ScoutTestConfigStatsEntrySchema.parse({
      path: 'some/config.ts',
      test_target: { location: 'local', arch: 'stateful', domain: 'classic' },
      target_attributes: ['fips'],
      runCount: 5,
      runtime: { avg: 100, median: 100, pc95th: 100, pc99th: 100, max: 100, estimate: 100 },
    });

    expect(parsed.target_attributes).toEqual(['fips']);
  });

  it('rejects unknown target_attributes', () => {
    expect(() =>
      ScoutTestConfigStatsEntrySchema.parse({
        path: 'some/config.ts',
        test_target: { location: 'local', arch: 'stateful', domain: 'classic' },
        target_attributes: ['quantum'],
        runCount: 5,
        runtime: { avg: 100, median: 100, pc95th: 100, pc99th: 100, max: 100, estimate: 100 },
      })
    ).toThrow();
  });
});

describe('ScoutTestConfigStats.fromElasticsearch', () => {
  const statsRecord = (overrides: Record<string, unknown> = {}) => ({
    location: 'local',
    arch: 'stateful',
    domain: 'classic',
    path: 'plugin/config.ts',
    run_count: 10,
    avg_ms: 5000,
    max_ms: 9000,
    median_ms: 4500,
    p95_ms: 7000,
    p99_ms: 8000,
    ...overrides,
  });

  const esClientReturning = (records: Array<Record<string, unknown>>) => {
    const esql = jest.fn().mockReturnValue({
      toRecords: jest.fn().mockResolvedValue({ records }),
    });
    return { client: { helpers: { esql } } as never, esql };
  };

  const fetch = (client: never) =>
    ScoutTestConfigStats.fromElasticsearch(client, {
      configPaths: [],
      lookbackDays: 1,
      buildkite: {},
    });

  it('groups runtime statistics by target attribute set', async () => {
    const { client, esql } = esClientReturning([
      statsRecord({ target_attributes: null, p95_ms: 7000 }),
      statsRecord({ target_attributes: 'fips', p95_ms: 12000 }),
    ]);

    const stats = await fetch(client);
    const query = esql.mock.calls[0][0].query as string;

    expect(query).toContain(
      'EVAL target_attributes = MV_CONCAT(MV_SORT(test_run.target.attributes), ",")'
    );
    expect(query).toContain(
      'BY test_run.config.file.path, test_run.target.type, test_run.target.mode, target_attributes'
    );

    expect(stats.data.configs).toHaveLength(2);
    expect(stats.data.configs[0].target_attributes).toEqual([]);
    expect(stats.data.configs[0].runtime.estimate).toBe(7000);
    expect(stats.data.configs[1].target_attributes).toEqual(['fips']);
    expect(stats.data.configs[1].runtime.estimate).toBe(12000);
  });

  it('drops records carrying attributes this branch does not know about', async () => {
    const { client } = esClientReturning([
      statsRecord({ target_attributes: 'quantum' }),
      statsRecord({ target_attributes: 'fips' }),
    ]);

    const stats = await fetch(client);

    expect(stats.data.configs).toHaveLength(1);
    expect(stats.data.configs[0].target_attributes).toEqual(['fips']);
  });

  it('falls back to an attribute-blind query when the column is not mapped yet', async () => {
    const unknownColumn = Object.assign(
      new Error(
        'verification_exception\n\tRoot causes:\n\t\tUnknown column [test_run.target.attributes]'
      ),
      { meta: { body: {} } }
    );
    const toRecords = jest
      .fn()
      .mockRejectedValueOnce(unknownColumn)
      .mockResolvedValueOnce({ records: [statsRecord()] });
    const esql = jest.fn().mockReturnValue({ toRecords });
    const client = { helpers: { esql } } as never;

    const stats = await fetch(client);

    expect(esql).toHaveBeenCalledTimes(2);
    expect(esql.mock.calls[1][0].query).not.toContain('target_attributes');
    expect(stats.data.configs).toHaveLength(1);
    expect(stats.data.configs[0].target_attributes).toEqual([]);
  });

  it('rethrows unrelated Elasticsearch errors', async () => {
    const toRecords = jest.fn().mockRejectedValue(new Error('index_not_found_exception'));
    const client = { helpers: { esql: jest.fn().mockReturnValue({ toRecords }) } } as never;

    await expect(fetch(client)).rejects.toThrow('index_not_found_exception');
  });
});

describe('ScoutTestConfigStats', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-stats-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const sampleStatsData = {
    lookbackDays: 3,
    buildkite: {
      branch: 'main',
      pipeline: { slug: 'kibana-on-merge' },
    },
    configs: [
      {
        path: 'plugin/config.ts',
        test_target: { location: 'local', arch: 'stateful', domain: 'classic' },
        runCount: 10,
        runtime: { avg: 5000, median: 4500, pc95th: 7000, pc99th: 8000, max: 9000, estimate: 7000 },
      },
    ],
  };

  describe('fromFile', () => {
    it('throws when the file does not exist', () => {
      expect(() => ScoutTestConfigStats.fromFile('/nonexistent/path/stats.json')).toThrow(
        'does not exist'
      );
    });

    it('reads lastUpdated from file mtime', () => {
      const filePath = path.join(tmpDir, 'stats.json');
      fs.writeFileSync(filePath, JSON.stringify(sampleStatsData));

      const stats = ScoutTestConfigStats.fromFile(filePath);
      const fileMtime = fs.statSync(filePath).mtime;

      expect(stats.data.lastUpdated.getTime()).toBe(fileMtime.getTime());
    });

    it('parses configs with test_target field', () => {
      const filePath = path.join(tmpDir, 'stats.json');
      fs.writeFileSync(filePath, JSON.stringify(sampleStatsData));

      const stats = ScoutTestConfigStats.fromFile(filePath);

      expect(stats.data.configs).toHaveLength(1);
      expect(stats.data.configs[0].test_target).toBeInstanceOf(ScoutTestTarget);
      expect(stats.data.configs[0].test_target.tag).toBe('local-stateful-classic');
    });

    it('rejects invalid data', () => {
      const filePath = path.join(tmpDir, 'invalid.json');
      fs.writeFileSync(filePath, JSON.stringify({ invalid: true }));

      expect(() => ScoutTestConfigStats.fromFile(filePath)).toThrow();
    });
  });

  describe('writeToFile', () => {
    it('excludes lastUpdated from written file', () => {
      const stats = new ScoutTestConfigStats(
        ScoutTestConfigStatsDataSchema.parse({
          lastUpdated: new Date('2025-01-01T00:00:00Z'),
          ...sampleStatsData,
        })
      );

      const filePath = path.join(tmpDir, 'output.json');
      stats.writeToFile(filePath);

      const written = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(written).not.toHaveProperty('lastUpdated');
    });

    it('creates parent directories recursively', () => {
      const stats = new ScoutTestConfigStats(
        ScoutTestConfigStatsDataSchema.parse({
          lastUpdated: new Date(),
          ...sampleStatsData,
        })
      );

      const filePath = path.join(tmpDir, 'nested', 'deep', 'output.json');
      stats.writeToFile(filePath);

      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('round-trip (writeToFile + fromFile)', () => {
    it('preserves data through a write-then-read cycle', () => {
      const filePath = path.join(tmpDir, 'roundtrip.json');
      fs.writeFileSync(filePath, JSON.stringify(sampleStatsData));

      const loaded = ScoutTestConfigStats.fromFile(filePath);
      const roundtripPath = path.join(tmpDir, 'roundtrip2.json');
      loaded.writeToFile(roundtripPath);

      const restored = ScoutTestConfigStats.fromFile(roundtripPath);

      expect(restored.data.lookbackDays).toBe(loaded.data.lookbackDays);
      expect(restored.data.buildkite).toEqual(loaded.data.buildkite);
      expect(restored.data.configs).toHaveLength(loaded.data.configs.length);

      expect(restored.data.configs[0].path).toBe(loaded.data.configs[0].path);
      expect(restored.data.configs[0].runCount).toBe(loaded.data.configs[0].runCount);
      expect(restored.data.configs[0].runtime).toEqual(loaded.data.configs[0].runtime);
      expect(restored.data.configs[0].test_target.tag).toBe(loaded.data.configs[0].test_target.tag);
    });
  });
});
