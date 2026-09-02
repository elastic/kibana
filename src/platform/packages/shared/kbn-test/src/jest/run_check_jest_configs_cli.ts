/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

import { getJestConfigs } from './configs/get_jest_configs';
import { isGeneratedJestConfig } from './configs/is_generated_jest_config';

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

      const { orphanedTestFiles, duplicateTestFiles, configsWithTests, emptyConfigs } =
        await getJestConfigs();

      // Convert to relative paths for display
      const missingConfigs = new Set(
        orphanedTestFiles.map((file) => Path.relative(REPO_ROOT, file))
      );

      const multipleConfigs = new Set(
        duplicateTestFiles.map(({ testFile, configs }) => ({
          configs: configs
            .map((c) => Path.relative(REPO_ROOT, c))
            .sort((a, b) => Path.dirname(a).localeCompare(Path.dirname(b))),
          rel: Path.relative(REPO_ROOT, testFile),
        }))
      );

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

      // Configs that match no tests fall into two buckets:
      //  - untouched `kbn-generate` boilerplate (mocks/types/Scout-only packages)
      //    which legitimately never had Jest tests — tolerated, and already
      //    filtered out of the CI test run order.
      //  - hand-customized configs (extra `roots`, `testMatch`, coverage config,
      //    `moduleNameMapper`, …) whose tests were removed or never added —
      //    these are dead code and must be deleted.
      const customizedEmptyConfigs = new Set(
        emptyConfigs
          .filter((config) => !isGeneratedJestConfig(config))
          .map((config) => Path.relative(REPO_ROOT, config))
      );

      if (customizedEmptyConfigs.size) {
        log.error(
          `The following jest configs are customized but match no test files, so they are ` +
            `never run and never report timings to ci-stats. Delete each config (and any ` +
            `entry in .buildkite/sharded_jest_configs.json), or restore the tests it was ` +
            `meant to run:\n${fmtList(customizedEmptyConfigs)}`
        );
      }

      log.info(
        `Summary
          - ${configsWithTests.length} configs with tests.
          - ${emptyConfigs.length} configs with no tests (${
          customizedEmptyConfigs.size
        } customized, ${emptyConfigs.length - customizedEmptyConfigs.size} generated boilerplate).
          - ${missingConfigs.size} test files not covered by any config.
          - ${multipleConfigs.size} test files covered by multiple configs.
        `
      );

      if (missingConfigs.size || multipleConfigs.size || customizedEmptyConfigs.size) {
        throw createFailError('Please resolve the previously logged issues.');
      }

      log.success('Checked all jest config files in', fmtMs(performance.now() - start));
    },
    {
      description: 'Check that all test files are covered by one, and only one, Jest config',
    }
  );
}
