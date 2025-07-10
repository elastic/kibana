/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client as ESClient } from 'elasticsearch-8.x'; // Switch to `@elastic/elasticsearch` when the CI cluster is upgraded.
import {
  AggregationsAvgAggregate,
  AggregationsMaxAggregate,
  AggregationsPercentilesBucketAggregate,
  AggregationsStatsBucketAggregate,
  AggregationsStringTermsBucket,
  SearchResponse,
} from 'elasticsearch-8.x/lib/api/types'; // Switch to `@elastic/elasticsearch/lib/api/types` when the CI cluster is upgraded.
import fs from 'node:fs';
import path from 'node:path';
import { z } from '@kbn/zod';

export const ScoutTestConfigStatsEntrySchema = z.object({
  path: z.string(),
  runCount: z.number().int(),
  runtime: z.object({
    avg: z.number().int(),
    median: z.number().int(),
    pc95th: z.number().int(),
    pc99th: z.number().int(),
    max: z.number().int(),
    estimate: z.number().int(),
  }),
});

export type ScoutTestConfigStatsEntry = z.infer<typeof ScoutTestConfigStatsEntrySchema>;

export const ScoutTestConfigStatsDataSchema = z.object({
  lastUpdated: z.coerce.date(),
  lookbackDays: z.number().int().min(1).max(7),
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

  findConfigByPath(configPath: string): ScoutTestConfigStatsEntry | undefined {
    return this.data.configs.find((config) => config.path === configPath);
  }

  public get largestConfig(): ScoutTestConfigStatsEntry {
    return this.data.configs.reduce((previous, current) =>
      current.runtime.estimate > previous.runtime.estimate ? current : previous
    );
  }

  writeToFile(outputPath: string) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(this.data, null, 2));
  }

  static fromFile(statsFilePath: string): ScoutTestConfigStats {
    if (!fs.existsSync(statsFilePath)) {
      throw new Error(
        `Failed while trying to parse test config stats file: path ${statsFilePath} does not exist`
      );
    }

    const data = ScoutTestConfigStatsDataSchema.parse(
      JSON.parse(fs.readFileSync(statsFilePath, 'utf8'))
    );
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
    }
  ): Promise<ScoutTestConfigStats> {
    // Build ES query
    const query: { bool: { must: Record<string, any> } } = {
      bool: {
        must: [
          { term: { 'event.action': { value: 'run-end' } } },
          { range: { '@timestamp': { gte: `now-${options.lookbackDays}d` } } },
        ],
      },
    };

    if (options.configPaths.length > 0) {
      query.bool.must.push({ terms: { 'test_run.config.file.path': options.configPaths } });
    }

    if (options.buildkite.branch) {
      query.bool.must.push({ term: { 'buildkite.branch': options.buildkite.branch } });
    }

    if (options.buildkite.pipelineSlug) {
      query.bool.must.push({ term: { 'buildkite.pipeline.slug': options.buildkite.pipelineSlug } });
    }

    // Fetch stats from ES
    const rsp: SearchResponse<
      any,
      {
        config_path: {
          buckets: Array<
            AggregationsStringTermsBucket & {
              avg: AggregationsAvgAggregate;
              percentile: AggregationsPercentilesBucketAggregate;
              max: AggregationsMaxAggregate;
            }
          >;
        };
        config_path_stats: AggregationsStatsBucketAggregate;
      }
    > = await es.search({
      size: 0,
      track_total_hits: true,
      query,
      aggs: {
        config_path: {
          terms: { field: 'test_run.config.file.path', size: 9999 },
          aggs: {
            avg: {
              avg: { field: 'test_run.duration' },
            },
            percentile: {
              percentiles: {
                field: 'test_run.duration',
                percents: [50, 95, 99],
                keyed: true,
              },
            },
            max: { max: { field: 'test_run.duration' } },
          },
        },
        config_path_stats: {
          stats_bucket: { buckets_path: 'config_path>_count' },
        },
      },
    });

    if (!rsp.aggregations) {
      throw new Error('Aggregation results from the ES search response');
    }

    // Process search response and into config stats
    const configs = rsp.aggregations.config_path.buckets.map((bucket) => {
      const percentiles = bucket.percentile.values as Record<string, number>;

      return ScoutTestConfigStatsEntrySchema.parse({
        path: bucket.key,
        runCount: bucket.doc_count,
        runtime: {
          avg: Math.floor(bucket.avg.value || 0),
          median: Math.floor(percentiles['50.0']),
          pc95th: Math.floor(percentiles['95.0']),
          pc99th: Math.floor(percentiles['99.0']),
          max: bucket.max.value || 0,
          estimate: Math.floor(percentiles['95.0'] || 0),
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
