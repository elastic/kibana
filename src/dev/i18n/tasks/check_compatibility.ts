/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { integrateLocaleFiles, I18nConfig } from '..';

export interface I18nFlags {
  fix: boolean;
  ignoreMalformed: boolean;
  ignoreIncompatible: boolean;
  ignoreUnused: boolean;
  ignoreMissing: boolean;
}

export function checkCompatibility(config: I18nConfig, flags: I18nFlags, log: ToolingLog) {
  const { fix, ignoreIncompatible, ignoreUnused, ignoreMalformed, ignoreMissing } = flags;
  return config.translations.map((translationsPath) => ({
    task: async ({ messages }: { messages: Map<string, { message: string }> }) => {
      // If `fix` is set we should try apply all possible fixes and override translations file.
      await integrateLocaleFiles(messages, {
        dryRun: !fix,
        ignoreIncompatible: fix || ignoreIncompatible,
        ignoreUnused: fix || ignoreUnused,
        ignoreMissing: fix || ignoreMissing,
        ignoreMalformed: fix || ignoreMalformed,
        sourceFileName: translationsPath,
        targetFileName: fix ? translationsPath : undefined,
        config,
        log,
      });
    },
    title: `Compatibility check with ${translationsPath}`,
  }));
}
