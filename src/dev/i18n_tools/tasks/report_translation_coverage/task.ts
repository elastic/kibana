/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PRESET_TIMER } from 'listr2';
import { writeFile as writeFileAsync } from 'fs/promises';
import type { TaskSignature } from '../../types';
import { ErrorReporter } from '../../utils/error_reporter';
import { makeAbsolutePath } from '../../utils';

export interface TaskOptions {
  source: string;
  reportPath?: string;
}

interface NamespaceCoverage {
  total: number;
  translated: number;
  missing: number;
  coverage: number;
}

interface TranslationCoverageReport {
  source: string;
  total: number;
  translated: number;
  missing: number;
  coverage: number;
  missingIds: string[];
  namespaces: Record<string, NamespaceCoverage>;
}

const formatPercent = (coverage: number) => `${(coverage * 100).toFixed(2)}%`;

export const reportTranslationCoverage: TaskSignature<TaskOptions> = (
  context,
  task,
  { source, reportPath }
) => {
  const { config, messages, localizedMessages, taskReporter } = context;
  const errorReporter = new ErrorReporter({ name: 'Report Translation Coverage' });

  if (!config || !Object.keys(config.paths).length) {
    throw errorReporter.reportFailure(
      'None of input paths is covered by the mappings in .i18nrc.json'
    );
  }

  return task.newListr(
    (parent) => [
      {
        title: `Reporting translation coverage for ${source}`,
        task: async () => {
          const translatedIds = new Set<string>(Object.keys(localizedMessages?.messages ?? {}));

          const namespaces: Record<string, NamespaceCoverage> = {};
          const missingIds: string[] = [];
          let total = 0;
          let translated = 0;

          for (const [namespace, namespaceMessages] of messages.entries()) {
            let nsTranslated = 0;
            for (const { id } of namespaceMessages) {
              if (translatedIds.has(id)) {
                nsTranslated++;
              } else {
                missingIds.push(id);
              }
            }
            const nsTotal = namespaceMessages.length;
            namespaces[namespace] = {
              total: nsTotal,
              translated: nsTranslated,
              missing: nsTotal - nsTranslated,
              coverage: nsTotal > 0 ? nsTranslated / nsTotal : 0,
            };
            total += nsTotal;
            translated += nsTranslated;
          }

          const coverage = total > 0 ? translated / total : 1;
          const summary = `Translation coverage for ${source}: ${translated}/${total} (${formatPercent(
            coverage
          )}) — missing ${total - translated}`;

          taskReporter.log(summary);
          parent.title = summary;

          if (reportPath) {
            const report: TranslationCoverageReport = {
              source,
              total,
              translated,
              missing: total - translated,
              coverage,
              missingIds: missingIds.sort(),
              namespaces,
            };
            await writeFileAsync(
              makeAbsolutePath(reportPath),
              `${JSON.stringify(report, null, 2)}\n`
            );
            taskReporter.log(`Wrote translation coverage report to ${reportPath}`);
          }
        },
      },
    ],
    { exitOnError: false, rendererOptions: { timer: PRESET_TIMER }, collectErrors: 'minimal' }
  );
};
