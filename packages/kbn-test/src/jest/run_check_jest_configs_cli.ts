/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

import { getAllJestPaths, getTestsForConfigPaths } from './configs';

const fmtMs = (ms: number) => {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  return `${(Math.round(ms) / 1000).toFixed(2)} s`;
};

const fmtList = (list: Iterable<string>) => [...list].map((i) => ` - ${i}`).join('\n');

export async function runCheckJestConfigsCli() {
  run(
    async ({ log }) => {
      const start = performance.now();

      const jestPaths = await getAllJestPaths();
      const allConfigs = await getTestsForConfigPaths(jestPaths.configs);
      const missingConfigs = new Set<string>();
      const multipleConfigs = new Set<{ configs: string[]; rel: string }>();

      for (const testPath of jestPaths.tests) {
        const configs = allConfigs
          .filter((c) => c.testPaths.has(testPath))
          .map((c) => Path.relative(REPO_ROOT, c.path))
          .sort((a, b) => Path.dirname(a).localeCompare(Path.dirname(b)));

        if (configs.length === 0) {
          missingConfigs.add(Path.relative(REPO_ROOT, testPath));
        } else if (configs.length > 1) {
          multipleConfigs.add({
            configs,
            rel: Path.relative(REPO_ROOT, testPath),
          });
        }
      }

      if (missingConfigs.size) {
        log.error(
          `The following test files are not selected by any jest config file:\n${fmtList(
            missingConfigs
          )}`
        );
      }

      if (multipleConfigs.size) {
        const overlaps = new Map<string, { configs: string[]; rels: string[] }>();
        for (const { configs, rel } of multipleConfigs) {
          const key = configs.join(':');
          const group = overlaps.get(key);
          if (group) {
            group.rels.push(rel);
          } else {
            overlaps.set(key, {
              configs,
              rels: [rel],
            });
          }
        }

        const list = [...overlaps.values()]
          .map(
            ({ configs, rels }) =>
              `configs: ${configs
                .map((c) => Path.relative(REPO_ROOT, c))
                .join(', ')}\ntests:\n${fmtList(rels)}`
          )
          .join('\n\n');

        log.error(`The following test files are selected by multiple config files:\n${list}`);
      }

      if (missingConfigs.size || multipleConfigs.size) {
        throw createFailError('Please resolve the previously logged issues.');
      }

      log.success('Checked all jest config files in', fmtMs(performance.now() - start));
    },
    {
      description: 'Check that all test files are covered by one, and only one, Jest config',
    }
  );
}
