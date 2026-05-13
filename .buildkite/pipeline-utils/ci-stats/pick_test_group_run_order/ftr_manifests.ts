/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Fs from 'fs';

import minimatch from 'minimatch';
import { parse as loadYaml } from 'yaml';

import { serverless, stateful } from '../../../ftr_configs_manifests.json';
import type { FtrConfigsManifest } from './types';

const ALL_FTR_MANIFEST_REL_PATHS = serverless.concat(stateful);

/**
 * Load all enabled FTR configs from the manifest yamls, optionally filtered
 * by glob patterns and/or solution names. Returns configs grouped by buildkite
 * agent queue, plus the manifest-defined defaultQueue.
 */
export function getEnabledFtrConfigs(
  patterns?: string[],
  solutions?: string[]
): { defaultQueue: string; ftrConfigsByQueue: Map<string, string[]> } {
  const configs: {
    enabled: Array<string | { [configPath: string]: { queue: string } }>;
    defaultQueue: string | undefined;
  } = { enabled: [], defaultQueue: undefined };
  const uniqueQueues = new Set<string>();

  const mappedSolutions = solutions?.map((s) => (s === 'observability' ? 'oblt' : s));
  for (const manifestRelPath of ALL_FTR_MANIFEST_REL_PATHS) {
    if (
      mappedSolutions &&
      !(
        mappedSolutions.some((s) => manifestRelPath.includes(`ftr_${s}_`)) ||
        // When applying the solution filter, still allow platform tests
        manifestRelPath.includes('ftr_platform_') ||
        manifestRelPath.includes('ftr_base_')
      )
    ) {
      continue;
    }
    try {
      const ymlData = loadYaml(Fs.readFileSync(manifestRelPath, 'utf8'));
      if (!isObj(ymlData)) {
        throw new Error('expected yaml file to parse to an object');
      }
      const manifest = ymlData as FtrConfigsManifest;

      configs.enabled.push(...(manifest?.enabled ?? []));
      if (manifest.defaultQueue) {
        uniqueQueues.add(manifest.defaultQueue);
      }
    } catch (_) {
      const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
      throw new Error(`unable to parse ${manifestRelPath} file: ${error.message}`);
    }
  }

  try {
    if (configs.enabled.length === 0) {
      throw new Error('expected yaml files to have at least 1 "enabled" key');
    }
    if (uniqueQueues.size !== 1) {
      throw Error(
        `FTR manifest yml files should define the same 'defaultQueue', but found different ones: ${[
          ...uniqueQueues,
        ].join(' ')}`
      );
    }
    configs.defaultQueue = uniqueQueues.values().next().value;

    if (
      !Array.isArray(configs.enabled) ||
      !configs.enabled.every(
        (p): p is string | { [configPath: string]: { queue: string } } =>
          typeof p === 'string' ||
          (isObj(p) &&
            Object.keys(p).length === 1 &&
            Object.values(p).every((v) => isObj(v) && typeof v.queue === 'string'))
      )
    ) {
      throw new Error(`expected "enabled" value to be an array of strings or objects shaped as:\n
  - {configPath}:
      queue: {queueName}`);
    }
    if (typeof configs.defaultQueue !== 'string') {
      throw new Error('expected yaml file to have a string "defaultQueue" key');
    }

    const defaultQueue = configs.defaultQueue;
    const ftrConfigsByQueue = new Map<string, string[]>();
    for (const enabled of configs.enabled) {
      const path = typeof enabled === 'string' ? enabled : Object.keys(enabled)[0];
      const queue = isObj(enabled) ? enabled[path].queue : defaultQueue;

      if (patterns && !patterns.some((pattern) => minimatch(path, pattern))) {
        continue;
      }

      const group = ftrConfigsByQueue.get(queue);
      if (group) {
        group.push(path);
      } else {
        ftrConfigsByQueue.set(queue, [path]);
      }
    }
    return { defaultQueue, ftrConfigsByQueue };
  } catch (_) {
    const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
    throw new Error(`unable to collect enabled FTR configs: ${error.message}`);
  }
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
