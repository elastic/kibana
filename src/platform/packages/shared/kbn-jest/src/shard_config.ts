/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { resolve, relative } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/** Separator used to encode shard info into a config name string */
const SHARD_ANNOTATION_SEP = '||shard=';

/** Map of config relative path -> number of shards */
export type ShardMap = Record<string, number>;

export interface ShardAnnotation {
  /** The config path (without annotation) */
  config: string;
  /** The shard string, e.g. "1/2", or undefined if no annotation */
  shard?: string;
}

let cachedShardMap: ShardMap | undefined;

/**
 * Reads and caches the shard configuration from `.buildkite/sharded_jest_configs.json`.
 * Returns an empty map if the file does not exist or cannot be parsed.
 */
export function loadShardConfig(): ShardMap {
  if (cachedShardMap !== undefined) {
    return cachedShardMap;
  }

  try {
    const jsonPath = resolve(REPO_ROOT, '.buildkite', 'sharded_jest_configs.json');
    const raw = readFileSync(jsonPath, 'utf8');
    cachedShardMap = JSON.parse(raw) as ShardMap;
  } catch {
    cachedShardMap = {};
  }

  return cachedShardMap;
}

/**
 * Resets the cached shard map (useful for testing).
 */
export function resetShardConfigCache(): void {
  cachedShardMap = undefined;
}

/**
 * Parses a shard annotation from a config name string.
 *
 * @example
 *   parseShardAnnotation('path/jest.config.js||shard=1/2')
 *   // => { config: 'path/jest.config.js', shard: '1/2' }
 *
 *   parseShardAnnotation('path/jest.config.js')
 *   // => { config: 'path/jest.config.js' }
 */
export function parseShardAnnotation(name: string): ShardAnnotation {
  const idx = name.indexOf(SHARD_ANNOTATION_SEP);
  if (idx === -1) {
    return { config: name };
  }
  return {
    config: name.substring(0, idx),
    shard: name.substring(idx + SHARD_ANNOTATION_SEP.length),
  };
}

/**
 * Annotates a config name with a shard value, producing a string like
 * `config.js||shard=1/2`.
 */
export function annotateConfigWithShard(config: string, shard: string): string {
  return `${config}${SHARD_ANNOTATION_SEP}${shard}`;
}

/**
 * Expands a list of config names using a shard map. Configs that appear in the
 * shard map are replaced with N shard-annotated entries. Configs not in the map
 * (or already annotated) are passed through unchanged.
 *
 * @param configs - Array of config paths (relative to repo root)
 * @param shardMap - Map of config path -> shard count
 * @returns Expanded array with shard-annotated entries
 */
export function expandShardedConfigs(configs: string[], shardMap: ShardMap): string[] {
  const expanded: string[] = [];

  for (const config of configs) {
    const { config: cleanConfig, shard: existingShard } = parseShardAnnotation(config);
    if (existingShard) {
      // Already annotated — pass through
      expanded.push(config);
      continue;
    }

    const shardCount = shardMap[cleanConfig];
    if (shardCount && shardCount > 1) {
      for (let i = 1; i <= shardCount; i++) {
        expanded.push(annotateConfigWithShard(cleanConfig, `${i}/${shardCount}`));
      }
    } else {
      expanded.push(config);
    }
  }

  return expanded;
}

/**
 * Looks up the shard count for a given config path (absolute or relative).
 * Returns the shard count if found, or undefined if the config is not sharded.
 */
export function getShardCountForConfig(configPath: string): number | undefined {
  const shardMap = loadShardConfig();
  // Try both relative and as-is
  const relPath = relative(REPO_ROOT, configPath);
  return shardMap[relPath] ?? shardMap[configPath];
}
