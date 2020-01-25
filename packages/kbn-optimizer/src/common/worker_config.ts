/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';

import { BundleDefinition, VALID_BUNDLE_TYPES } from './bundle_definition';

export interface WorkerConfig {
  readonly repoRoot: string;
  readonly watch: boolean;
  readonly dist: boolean;
  readonly bundles: BundleDefinition[];
  readonly profileWebpack: boolean;
}

type UnknownVals<T extends object> = {
  [k in keyof T]: unknown;
};

export function parseWorkerConfig(json: string) {
  try {
    if (typeof json !== 'string') {
      throw new Error('expected config to be a JSON string');
    }

    const parsed: UnknownVals<WorkerConfig> = JSON.parse(json);
    if (!(parsed && typeof parsed === 'object')) {
      throw new Error('config must be an object');
    }

    if (!(parsed.watch === undefined || typeof parsed.watch === 'boolean')) {
      throw new Error('`watch` config must be a boolean when defined');
    }

    if (!(parsed.dist === undefined || typeof parsed.dist === 'boolean')) {
      throw new Error('`dist` config must be a boolean when defined');
    }

    if (typeof parsed.profileWebpack !== 'boolean') {
      throw new Error('`profileWebpack` must be a boolean');
    }

    if (!Array.isArray(parsed.bundles)) {
      throw new Error('config.bundles must be an array');
    }

    for (const parsedBundle of parsed.bundles as Array<UnknownVals<BundleDefinition>>) {
      if (!(parsedBundle && typeof parsedBundle === 'object')) {
        throw new Error('config.bundles[] must be an object');
      }

      if (!VALID_BUNDLE_TYPES.includes(parsedBundle.type as any)) {
        throw new Error('config.bundles[] must have a valid `type`');
      }

      if (!(typeof parsedBundle.id === 'string')) {
        throw new Error('config.bundles[] must have a string `id` property');
      }

      if (!(typeof parsedBundle.entry === 'string')) {
        throw new Error('config.bundles[] must have a string `entry` property');
      }

      if (typeof parsedBundle.outputDir !== 'string') {
        throw new Error('`outputDir` config must be a string');
      }

      if (
        !(typeof parsedBundle.contextDir === 'string' && Path.isAbsolute(parsedBundle.contextDir))
      ) {
        throw new Error('config.bundles[] must have a string `contextDir` property');
      }
    }

    return {
      error: undefined,
      workerConfig: parsed as WorkerConfig,
    };
  } catch (error) {
    return {
      error: new Error(`unable to parse worker config: ${error.message}`),
      workerConfig: undefined,
    };
  }
}
