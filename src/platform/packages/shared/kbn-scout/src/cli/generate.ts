/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import Fsp from 'fs/promises';
import inquirer from 'inquirer';
import Path from 'path';

type TestType = 'ui' | 'api' | 'both';

const COPYRIGHT_HEADER_SRC = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

`;

const COPYRIGHT_HEADER_XPACK = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

`;

function getCopyrightHeader(basePath: string): string {
  const normalizedPath = basePath.replace(/\\/g, '/');
  if (normalizedPath.startsWith('x-pack/')) {
    return COPYRIGHT_HEADER_XPACK;
  }
  // Default to src header if path doesn't match 'x-pack/'
  return COPYRIGHT_HEADER_SRC;
}

function getScoutPackageImport(basePath: string): string {
  const normalizedPath = basePath.replace(/\\/g, '/');

  if (normalizedPath.startsWith('src/platform/') || normalizedPath.startsWith('x-pack/platform/')) {
    return '@kbn/scout';
  }

  if (normalizedPath.startsWith('x-pack/solutions/search')) {
    return '@kbn/scout-search';
  }

  if (normalizedPath.startsWith('x-pack/solutions/security')) {
    return '@kbn/scout-security';
  }

  if (normalizedPath.startsWith('x-pack/solutions/observability')) {
    return '@kbn/scout-oblt';
  }

  throw new Error(
    `Path "${basePath}" does not match any supported pattern. Supported patterns: ` +
      `"src/platform/**", "x-pack/platform/**", "x-pack/solutions/search/**", ` +
      `"x-pack/solutions/security/**", or "x-pack/solutions/observability/**"`
  );
}

function generateConfigContent(
  scoutPackage: string,
  testDir: string,
  copyrightHeader: string,
  options?: { workers?: number; runGlobalSetup?: boolean }
): string {
  const configOptions = [`  testDir: '${testDir}',`];
  if (options?.workers !== undefined) {
    configOptions.push(`  workers: ${options.workers},`);
  }
  if (options?.runGlobalSetup !== undefined) {
    configOptions.push(`  runGlobalSetup: ${options.runGlobalSetup},`);
  }

  return `${copyrightHeader}import { createPlaywrightConfig } from '${scoutPackage}';

export default createPlaywrightConfig({
${configOptions.join('\n')}
});
`;
}

async function validatePath(input: string): Promise<boolean | string> {
  const normalizedPath = input.trim();
  if (!normalizedPath) {
    return 'Path cannot be empty';
  }

  const fullPath = Path.resolve(REPO_ROOT, normalizedPath);

  if (!fullPath.startsWith(REPO_ROOT)) {
    return 'Path must be within the repository root';
  }

  try {
    const stat = await Fsp.stat(fullPath);
    if (!stat.isDirectory()) {
      return 'Path must be a directory';
    }
  } catch (error) {
    return `Path does not exist: ${normalizedPath}`;
  }

  try {
    getScoutPackageImport(normalizedPath);
    return true;
  } catch (error) {
    return error instanceof Error ? error.message : 'Path does not match supported patterns';
  }
}

async function createDirectoryStructure(
  basePath: string,
  testType: TestType,
  uiParallel: boolean,
  log: any
): Promise<void> {
  const fullBasePath = Path.resolve(REPO_ROOT, basePath);
  const scoutPackage = getScoutPackageImport(basePath);
  const copyrightHeader = getCopyrightHeader(basePath);

  if (testType === 'api' || testType === 'both') {
    const apiTestDir = Path.resolve(fullBasePath, 'test/scout/api');
    const apiFixturesDir = Path.resolve(apiTestDir, 'fixtures');
    const apiTestsDir = Path.resolve(apiTestDir, 'tests');
    const apiConfigPath = Path.resolve(apiTestDir, 'playwright.config.ts');

    await Fsp.mkdir(apiFixturesDir, { recursive: true });
    log.debug('created dir', apiFixturesDir);
    await Fsp.mkdir(apiTestsDir, { recursive: true });
    log.debug('created dir', apiTestsDir);
    const apiConfigContent = generateConfigContent(scoutPackage, './tests', copyrightHeader);
    await Fsp.writeFile(apiConfigPath, apiConfigContent);
    log.debug('created file', apiConfigPath);
  }

  if (testType === 'ui' || testType === 'both') {
    const uiTestDir = Path.resolve(fullBasePath, 'test/scout/ui');
    const uiFixturesDir = Path.resolve(uiTestDir, 'fixtures');

    if (uiParallel) {
      const uiParallelTestsDir = Path.resolve(uiTestDir, 'parallel_tests');
      const uiConfigPath = Path.resolve(uiTestDir, 'parallel.playwright.config.ts');

      await Fsp.mkdir(uiFixturesDir, { recursive: true });
      log.debug('created dir', uiFixturesDir);
      await Fsp.mkdir(uiParallelTestsDir, { recursive: true });
      log.debug('created dir', uiParallelTestsDir);
      const uiParallelConfigContent = generateConfigContent(
        scoutPackage,
        './parallel_tests',
        copyrightHeader,
        {
          workers: 2,
          runGlobalSetup: true,
        }
      );
      await Fsp.writeFile(uiConfigPath, uiParallelConfigContent);
      log.debug('created file', uiConfigPath);
    } else {
      const uiTestsDir = Path.resolve(uiTestDir, 'tests');
      const uiConfigPath = Path.resolve(uiTestDir, 'playwright.config.ts');

      await Fsp.mkdir(uiFixturesDir, { recursive: true });
      log.debug('created dir', uiFixturesDir);
      await Fsp.mkdir(uiTestsDir, { recursive: true });
      log.debug('created dir', uiTestsDir);
      const uiConfigContent = generateConfigContent(scoutPackage, './tests', copyrightHeader);
      await Fsp.writeFile(uiConfigPath, uiConfigContent);
      log.debug('created file', uiConfigPath);
    }
  }
}

export const generateCmd: Command<void> = {
  name: 'generate',
  description: `
  Generate Scout test directory structure for a plugin or package.

  This command interactively prompts for:
  - Relative path to plugin or package (e.g., x-pack/platform/plugins/shared/maps)
  - Test type: ui, api, or both (default: api)
  - For UI tests: whether tests can run in parallel (default: yes)

  It creates the appropriate directory structure and Playwright config files.
  `,
  flags: {},
  run: async ({ log }) => {
    let relativePath: string = '';

    while (true) {
      const pathResult = await inquirer.prompt<{ path: string }>({
        type: 'input',
        name: 'path',
        message:
          'What is the relative path to the plugin or package? (e.g., x-pack/platform/plugins/shared/maps)',
        validate: async (input) => {
          const result = await validatePath(input);
          if (result === true) {
            return true;
          }
          return result as string;
        },
      });

      relativePath = pathResult.path.trim();
      const validationResult = await validatePath(relativePath);
      if (validationResult === true) {
        break;
      } else {
        log.error(validationResult as string);
      }
    }

    log.info(`Validated path: ${relativePath}`);

    const testTypeResult = await inquirer.prompt<{ testType: TestType }>({
      type: 'list',
      name: 'testType',
      message: 'What type of tests do you plan to add?',
      default: 'api',
      choices: [
        { name: 'API tests', value: 'api' },
        { name: 'UI tests', value: 'ui' },
        { name: 'Both API and UI tests', value: 'both' },
      ],
    });

    const testType = testTypeResult.testType;
    log.info(`Selected test type: ${testType}`);

    let uiParallel = false;
    if (testType === 'ui' || testType === 'both') {
      const parallelResult = await inquirer.prompt<{ parallel: boolean }>({
        type: 'list',
        name: 'parallel',
        message:
          'Is it possible to design UI tests to run in parallel against the same cluster (e.g., in isolated Kibana spaces)?',
        default: true,
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
      });
      uiParallel = parallelResult.parallel;
      log.info(`UI tests parallel: ${uiParallel}`);
    }

    log.info('Creating directory structure...');
    await createDirectoryStructure(relativePath, testType, uiParallel, log);

    log.success(`Successfully generated Scout test structure for ${relativePath}`);
  },
};
