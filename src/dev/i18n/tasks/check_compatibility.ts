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

import { ToolingLog } from '@kbn/dev-utils';
import { integrateLocaleFiles, I18nConfig } from '..';

export interface I18nFlags {
  fix: boolean;
  ignoreIncompatible: boolean;
  ignoreUnused: boolean;
  ignoreMissing: boolean;
}

export function checkCompatibility(config: I18nConfig, flags: I18nFlags, log: ToolingLog) {
  const { fix, ignoreIncompatible, ignoreUnused, ignoreMissing } = flags;
  return config.translations.map(translationsPath => ({
    task: async ({ messages }: { messages: Map<string, { message: string }> }) => {
      // If `fix` is set we should try apply all possible fixes and override translations file.
      await integrateLocaleFiles(messages, {
        dryRun: !fix,
        ignoreIncompatible: fix || ignoreIncompatible,
        ignoreUnused: fix || ignoreUnused,
        ignoreMissing: fix || ignoreMissing,
        sourceFileName: translationsPath,
        targetFileName: fix ? translationsPath : undefined,
        config,
        log,
      });
    },
    title: `Compatibility check with ${translationsPath}`,
  }));
}
