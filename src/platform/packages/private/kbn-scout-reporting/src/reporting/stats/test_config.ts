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
import type { ToolingLog } from '@kbn/tooling-log';
import { z } from '@kbn/zod/v4';
import {
  SCOUT_TEST_EVENTS_INDEX_PATTERN,
  ScoutTargetAttributeSchema,
  ScoutTestTarget,
  ScoutTestTargetSchema,
  targetAttributes,
  testTargets,
} from '@kbn/scout-info';

/** ESQL column holding the canonical, sorted attribute key for a run. */
const TARGET_ATTRIBUTES_COLUMN = 'target_attributes';

const isUnknownColumnError = (error: unknown, column: string): boolean => {
  // ResponseError surfaces the ESQL verification failure through `message` (error type plus
  // root causes); fall back to the raw body in case the root causes are ever omitted.
  const body = (error as { meta?: { body?: unknown } } | undefined)?.meta?.body;
  const text = [
    error instanceof Error ? error.message : String(error),
    body === undefined ? '' : JSON.stringify(body),
  ].join('\n');

  return text.includes('Unknown column') && text.includes(column);
};

export const ScoutTestConfigStatsEntrySchema = z.object({
  path: z.string(),
  test_target: ScoutTestTargetSchema.transform(
    (data) => new ScoutTestTarget(data.location, data.arch, data.domain)
  ),
  // Defaulted so stats files written before attributes were recorded stay readable.
  target_attributes: z.array(ScoutTargetAttributeSchema).default([]),
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
      lookbackDays: number;
      buildkite: {
        branch?: string;
        pipelineSlug?: string;
      };
      log?: ToolingLog;
    }
  ): Promise<ScoutTestConfigStats> {
    const parsableModes: Set<String> = new Set(
      testTargets.all.map((target) => `${target.arch}-${target.domain}`)
    );

    // Build ES query filters
    const whereClauses = [
      `@timestamp >= NOW() - ${options.lookbackDays}day`,
      'event.action == "run-end"',

      // The remote could have records of domains that this branch has no idea about,
      // and we need to make sure that those won't make it in the query results
      `test_run.target.mode IN (${parsableModes
        .values()
        .map((mode) => `"${mode}"`)
        .toArray()
        .join(', ')})`,
    ];

    if (options.configPaths.length > 0) {
      whereClauses.push(
        `test_run.config.file.path IN (${options.configPaths
          .map((configPath) => `"${configPath}"`)
          .join(', ')})`
      );
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

    // Runtime differs per target attribute set (a FIPS run is not comparable to a
    // non-FIPS one), so group by it as well and keep the buckets apart.
    const buildQuery = (groupByTargetAttributes: boolean) =>
      [
        `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
        `WHERE ${whereClauses.join(' AND ')}`,
        ...(groupByTargetAttributes
          ? [
              `EVAL ${TARGET_ATTRIBUTES_COLUMN} =` +
                ' MV_CONCAT(MV_SORT(test_run.target.attributes), ",")',
            ]
          : []),
        `STATS ${statsClauses.join(', ')}` +
          ' BY test_run.config.file.path, test_run.target.type, test_run.target.mode' +
          (groupByTargetAttributes ? `, ${TARGET_ATTRIBUTES_COLUMN}` : ''),
        'DISSECT test_run.target.mode "%{arch}-%{domain}"',
        'DROP test_run.target.mode',
        'RENAME test_run.config.file.path AS path, test_run.target.type AS location',
        'LIMIT 10000',
      ].join(' | ');

    interface StatsRecord {
      location: string;
      arch: string;
      domain: string;
      path: string;
      target_attributes?: string | null;
      run_count: number;
      avg_ms: number;
      max_ms: number;
      median_ms: number;
      p95_ms: number;
      p99_ms: number;
    }

    let records: StatsRecord[];
    try {
      records = (await es.helpers.esql({ query: buildQuery(true) }).toRecords<StatsRecord>())
        .records;
    } catch (e) {
      // The mapping ships with this code but is only applied to the cluster by
      // `scout initialize-report-datastream`; until that runs, the column does not exist.
      if (!isUnknownColumnError(e, 'test_run.target.attributes')) {
        throw e;
      }

      options.log?.warning(
        'Scout test events carry no target attributes yet, so runtime stats cannot be split per' +
          ' attribute set. Run `scout initialize-report-datastream` to update the mapping.'
      );
      records = (await es.helpers.esql({ query: buildQuery(false) }).toRecords<StatsRecord>())
        .records;
    }

    // The remote could have records of attributes that this branch has no idea about,
    // and we need to make sure that those won't make it in the query results
    const parsableAttributes: Set<string> = new Set(targetAttributes.all);

    // Process response and into config stats
    const configs = records
      .filter((stats) => stats.arch != null && stats.domain != null)
      .filter((stats) =>
        (stats.target_attributes ?? '')
          .split(',')
          .filter((attribute) => attribute.length > 0)
          .every((attribute) => parsableAttributes.has(attribute))
      )
      .map((stats) => {
        return ScoutTestConfigStatsEntrySchema.parse({
          path: stats.path,
          test_target: new ScoutTestTarget(stats.location, stats.arch, stats.domain),
          target_attributes: targetAttributes.fromCommaSeparated(stats.target_attributes),
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
