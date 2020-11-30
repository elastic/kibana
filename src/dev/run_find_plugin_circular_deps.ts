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

import { run } from '@kbn/dev-utils';
import { findPlugins, getPluginDeps, SearchErrors } from './plugin_discovery';

interface AllOptions {
  examples?: boolean;
  extraPluginScanDirs?: string[];
}

run(
  async ({ flags, log }) => {
    const { examples = false, extraPluginScanDirs = [] } = flags as AllOptions;

    const pluginMap = findPlugins({
      oss: false,
      examples,
      extraPluginScanDirs,
    });

    const allErrors = new Map<string, SearchErrors>();
    for (const pluginId of pluginMap.keys()) {
      const { errors } = getPluginDeps({
        pluginMap,
        id: pluginId,
      });

      for (const [errorId, error] of errors) {
        if (!allErrors.has(errorId)) {
          allErrors.set(errorId, error);
        }
      }
    }

    if (allErrors.size > 0) {
      allErrors.forEach((error) => {
        log.warning(
          `Circular refs detected: ${[...error.stack, error.to].map((p) => `[${p}]`).join(' --> ')}`
        );
      });
    }
  },
  {
    flags: {
      boolean: ['examples'],
      default: {
        examples: false,
      },
      allowUnexpected: false,
      help: `
        --examples            Include examples folder
        --extraPluginScanDirs Include extra scan folder
      `,
    },
  }
);
