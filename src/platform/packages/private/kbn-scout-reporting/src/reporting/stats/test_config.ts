/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as ESClient } from '@elastic/elasticsearch';
import fs from 'node:fs';
import path from 'node:path';
import { z } from '@kbn/zod/v4';
import {
  SCOUT_TEST_EVENTS_INDEX_PATTERN,
  ScoutTestTarget,
  ScoutTestTargetSchema,
} from '@kbn/scout-info';

export const ScoutTestConfigStatsEntrySchema = z.object({
  path: z.string(),
  test_target: ScoutTestTargetSchema.transform(
    (data) => new ScoutTestTarget(data.location, data.arch, data.domain)
  ),
  runCount: z.int(),
  runtime: z.object({
    avg: z.int(),
    median: z.int(),
    pc95th: z.int(),
    pc99th: z.int(),
    max: z.int(),
    estimate: z.int(),
  }),
});

export type ScoutTestConfigStatsEntry = z.infer<typeof ScoutTestConfigStatsEntrySchema>;

export const ScoutTestConfigStatsDataSchema = z.object({
  lastUpdated: z.coerce.date(),
  lookbackDays: z.int().min(1).max(7),
  buildkite: z.object({
    branch: z.optional(z.string()),
    pipeline: z.optional(
      z.object({
        slug: z.optional(z.string()),
      })
    ),
  }),
  configs: z.array(ScoutTestConfigStatsEntrySchema),
});

export type ScoutTestConfigStatsData = z.infer<typeof ScoutTestConfigStatsDataSchema>;

export class ScoutTestConfigStats {
  constructor(public data: ScoutTestConfigStatsData) {}

  writeToFile(outputPath: string) {
    // lastUpdated shouldn't make it into the file because we read if from file attributes
    const { lastUpdated, ...fileData } = this.data;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(fileData, null, 2));
  }

  static fromFile(statsFilePath: string): ScoutTestConfigStats {
    if (!fs.existsSync(statsFilePath)) {
      throw new Error(
        `Failed while trying to parse test config stats file: path ${statsFilePath} does not exist`
      );
    }

    const data = ScoutTestConfigStatsDataSchema.parse({
      lastUpdated: fs.statSync(statsFilePath).mtime,
      ...JSON.parse(fs.readFileSync(statsFilePath, 'utf8')),
    });
    return new ScoutTestConfigStats(data);
  }

  static async fromElasticsearch(
    es: ESClient,
    options: {
      configPaths: string[];
      testTargets: ScoutTestTarget[];
      lookbackDays: number;
      buildkite: {
        branch?: string;
        pipelineSlug?: string;
      };
    }
  ): Promise<ScoutTestConfigStats> {
    // Build ES query filters
    const whereClauses = [
      `@timestamp >= NOW() - ${options.lookbackDays}day`,
      'event.action == "run-end"',
    ];

    if (options.configPaths.length > 0) {
      whereClauses.push(
        `test_run.config.file.path IN (${options.configPaths
          .map((configPath) => `"${configPath}"`)
          .join(', ')})`
      );
    }

    if (options.testTargets.length > 0) {
      whereClauses.push(
        options.testTargets
          .map(
            (testTarget) =>
              `(test_run.target.type == "${testTarget.location}"` +
              ` AND test_run.target.mode == "${testTarget.tagWithoutLocation}")`
          )
          .join(' OR ')
      );
    } else {
      whereClauses.push('test_run.target.mode != "unknown"');
    }

    if (options.buildkite.branch) {
      whereClauses.push(`buildkite.branch == "${options.buildkite.branch}"`);
    }

    if (options.buildkite.pipelineSlug) {
      whereClauses.push(`buildkite.pipeline.slug == "${options.buildkite.pipelineSlug}"`);
    }

    const statsClauses = [
      'run_count = COUNT(*)',
      'avg_ms = AVG(test_run.duration)',
      'max_ms = MAX(test_run.duration)',
      'median_ms = MEDIAN(test_run.duration)',
      'p95_ms = PERCENTILE(test_run.duration, 95)',
      'p99_ms = PERCENTILE(test_run.duration, 99)',
    ];

    const queryClauses = [
      `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
      `WHERE ${whereClauses.join(' AND ')}`,
      `STATS ${statsClauses.join(', ')}` +
        ' BY test_run.config.file.path, test_run.target.type, test_run.target.mode',
      'DISSECT test_run.target.mode "%{arch}-%{domain}"',
      'DROP test_run.target.mode',
      'RENAME test_run.config.file.path AS path, test_run.target.type AS location',
      'LIMIT 10000',
    ];

    // Process response and into config stats
    const configs = (
      await es.helpers.esql({ query: queryClauses.join(' | ') }).toRecords<{
        location: string;
        arch: string;
        domain: string;
        path: string;
        run_count: number;
        avg_ms: number;
        max_ms: number;
        median_ms: number;
        p95_ms: number;
        p99_ms: number;
      }>()
    ).records
      .filter((stats) => stats.arch != null && stats.domain != null)
      .map((stats) => {
        return ScoutTestConfigStatsEntrySchema.parse({
          path: stats.path,
          test_target: new ScoutTestTarget(stats.location, stats.arch, stats.domain),
          runCount: stats.run_count,
          runtime: {
            avg: Math.floor(stats.avg_ms || 0),
            median: Math.floor(stats.median_ms),
            pc95th: Math.floor(stats.p95_ms),
            pc99th: Math.floor(stats.p99_ms),
            max: stats.max_ms || 0,
            estimate: Math.floor(stats.p95_ms || 0),
          },
        });
      });

    return new ScoutTestConfigStats({
      lastUpdated: new Date(),
      lookbackDays: options.lookbackDays,
      buildkite: {
        branch: options.buildkite.branch,
        pipeline: {
          slug: options.buildkite.pipelineSlug,
        },
      },
      configs,
    });
  }
}
