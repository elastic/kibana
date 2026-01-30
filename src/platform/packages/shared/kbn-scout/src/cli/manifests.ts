/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import CliTable3 from 'cli-table3';
import dedent from 'dedent';
import path from 'path';
import { unlinkSync } from 'node:fs';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  testableModules,
  testConfigs,
  testConfigManifests,
  getGitSHA1ForPath,
  type ScoutTestableModuleWithConfigs,
} from '@kbn/scout-reporting';
import { playwrightCLI } from '../playwright/cli_wrapper';

const manifestUpdateReporter = path.join(
  REPO_ROOT,
  '/src/platform/packages/private/kbn-scout-reporting/src/reporting/playwright/manifest_updater'
);

async function generateScoutConfigManifest(configPath: string, log?: ToolingLog) {
  return await playwrightCLI.test(
    { config: configPath, reporters: [manifestUpdateReporter], list: true, project: 'local' },
    {},
    log
  );
}

async function updateScoutConfigManifests(
  onlyOutdated: boolean,
  removeDangling: boolean,
  reload: boolean,
  log: ToolingLog
) {
  const expectedManifestPaths: string[] = [];
  const updatedConfigPaths: string[] = [];

  // Update manifests for files that are outdated
  for (const config of testConfigs.all) {
    expectedManifestPaths.push(config.manifest.path);
    const configDirSHA1 = await getGitSHA1ForPath(path.dirname(config.path));

    if (onlyOutdated && config.manifest.exists && config.manifest.sha1 === configDirSHA1) {
      log.debug(` ✅ ${config.module.name} / ${config.category} / ${config.type}`);
      continue;
    }

    if (config.manifest.exists) {
      if (config.manifest.sha1 !== configDirSHA1) {
        log.info(
          `Manifest file is outdated for Scout test config at ${config.path} ` +
            `(expected parent directory git object hash '${config.manifest.sha1}' but got '${configDirSHA1}')`
        );
      }
    } else {
      log.info(`No manifest file found for Scout test config at ${config.path}`);
    }

    log.info(`Generating manifest for test config at '${config.path}'`);
    await generateScoutConfigManifest(config.path, log);
    updatedConfigPaths.push(config.path);
  }

  if (removeDangling) {
    // Remove any manifest files that no longer have a corresponding test config
    testConfigManifests
      .findPaths()
      .filter((manifestPath) => !expectedManifestPaths.includes(manifestPath))
      .forEach((manifestPath) => {
        log.info(`Removing dangling manifest file at '${manifestPath}'`);
        unlinkSync(manifestPath);
      });
  }

  if (updatedConfigPaths.length === 0) {
    log.info('No Scout test config manifests were updated');
  } else {
    log.info(
      `${updatedConfigPaths.length} test config manifest${
        updatedConfigPaths.length > 1 ? 's have' : ' has'
      } been updated.`
    );

    if (reload) testConfigs.reload();
  }

  return updatedConfigPaths;
}

function displaySummary(modules: ScoutTestableModuleWithConfigs[], log: ToolingLog) {
  const pluginTable = new CliTable3({
    head: ['#', 'Name', 'Group', 'Visibility', 'Path', 'Configs', 'Tests', 'Skipped'],
  });
  const packageTable = new CliTable3({
    head: ['#', 'Name', 'Group', 'Visibility', 'Path', 'Configs', 'Tests', 'Skipped'],
  });

  modules.forEach((module) => {
    const targetTable = module.type === 'plugin' ? pluginTable : packageTable;
    targetTable.push([
      targetTable.length + 1,
      module.name,
      module.group,
      module.visibility || '-',
      module.root,
      module.configs.length,
      module.configs.reduce((testCount, config) => testCount + config.manifest.tests.length, 0),
      module.configs.reduce(
        (skippedCount, config) =>
          skippedCount +
          config.manifest.tests.filter((test) => test.expectedStatus === 'skipped').length,
        0
      ),
    ]);
  });

  const panel = new CliTable3();
  panel.push(
    [{ content: 'Scout testable modules summary', hAlign: 'center' }],
    [`Found ${modules.length} modules with Scout configs.`],
    [
      dedent(
        `Plugins
        ${pluginTable.toString()}`
      ),
    ],
    [
      dedent(
        `Packages
        ${packageTable.toString()}`
      ),
    ]
  );

  log.write('\n');
  log.write(panel.toString());
}

export const updateTestConfigManifests: Command<void> = {
  name: 'update-test-config-manifests',
  description:
    'This command is used to collects and store information relating to a Scout test config ' +
    "that's usually only available during Playwright runtime",
  flags: {
    boolean: ['includingUpToDate', 'noSummary', 'keepDangling'],
    help: `
    --includingUpToDate  (optional)  Update all manifests, not just the ones that are outdated
    --keepDangling       (optional)  Don't remove dangling manifest files
    --noSummary          (optional)  Don't display summary
    `,
  },
  run: async ({ flagsReader, log }) => {
    testConfigs.log = log;
    const shouldDisplaySummary = !flagsReader.boolean('noSummary');
    const shouldRemoveDangling = !flagsReader.boolean('keepDangling');
    await updateScoutConfigManifests(
      !flagsReader.boolean('includingUpToDate'),
      shouldDisplaySummary,
      shouldRemoveDangling,
      log
    );
    if (!shouldDisplaySummary) return;
    displaySummary(testableModules.allIncludingConfigs, log);
  },
};
