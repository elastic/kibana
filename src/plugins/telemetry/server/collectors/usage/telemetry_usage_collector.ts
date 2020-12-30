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

import { accessSync, constants, readFileSync, statSync } from 'fs';
import { safeLoad } from 'js-yaml';
import { dirname, join } from 'path';
import { Observable } from 'rxjs';

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { take } from 'rxjs/operators';
import { TelemetryConfigType } from '../../config';

// look for telemetry.yml in the same places we expect kibana.yml
import { ensureDeepObject } from './ensure_deep_object';
import { staticTelemetrySchema } from './schema';

/**
 * The maximum file size before we ignore it (note: this limit is arbitrary).
 */
export const MAX_FILE_SIZE = 10 * 1024; // 10 KB

/**
 * Determine if the supplied `path` is readable.
 *
 * @param path The possible path where a config file may exist.
 * @returns `true` if the file should be used.
 */
export function isFileReadable(path: string): boolean {
  try {
    accessSync(path, constants.R_OK);

    // ignore files above the limit
    const stats = statSync(path);
    return stats.size <= MAX_FILE_SIZE;
  } catch (e) {
    return false;
  }
}

/**
 * Load the `telemetry.yml` file, if it exists, and return its contents as
 * a JSON object.
 *
 * @param configPath The config file path.
 * @returns The unmodified JSON object if the file exists and is a valid YAML file.
 */
export async function readTelemetryFile<T extends object>(
  configPath: string
): Promise<T | undefined> {
  try {
    if (isFileReadable(configPath)) {
      const yaml = readFileSync(configPath);
      const data = safeLoad(yaml.toString());

      // don't bother returning empty objects
      if (Object.keys(data).length) {
        // ensure { "a.b": "value" } becomes { "a": { "b": "value" } }
        return ensureDeepObject(data);
      }
    }
  } catch (e) {
    // ignored
  }

  return undefined;
}

export interface LicenseUsage {
  uuid: string;
  type: string;
  issued_to: string;
  issuer: string;
  issue_date_in_millis: number;
  start_date_in_millis: number;
  expiry_date_in_millis: number;
  max_resource_units: number;
}

export interface StaticTelemetryUsage {
  ece?: {
    kb_uuid: string;
    es_uuid: string;
    account_id: string;
    license: LicenseUsage;
  };
  ess?: {
    kb_uuid: string;
    es_uuid: string;
    account_id: string;
    license: LicenseUsage;
  };
  eck?: {
    operator_uuid: string;
    operator_roles: string;
    custom_operator_namespace: boolean;
    distribution: string;
    build: {
      hash: string;
      date: string;
      version: string;
    };
  };
}

export function createTelemetryUsageCollector(
  usageCollection: UsageCollectionSetup,
  getConfigPathFn: () => Promise<string>
) {
  return usageCollection.makeUsageCollector<StaticTelemetryUsage | undefined>({
    type: 'static_telemetry',
    isReady: () => true,
    fetch: async () => {
      const configPath = await getConfigPathFn();
      const telemetryPath = join(dirname(configPath), 'telemetry.yml');
      return await readTelemetryFile(telemetryPath);
    },
    schema: staticTelemetrySchema,
  });
}

export function registerTelemetryUsageCollector(
  usageCollection: UsageCollectionSetup,
  config$: Observable<TelemetryConfigType>
) {
  const collector = createTelemetryUsageCollector(usageCollection, async () => {
    const config = await config$.pipe(take(1)).toPromise();
    return config.config;
  });
  usageCollection.registerCollector(collector);
}
