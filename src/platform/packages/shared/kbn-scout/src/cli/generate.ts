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
import {
  generateApiConstantsContent,
  generateApiFixturesIndexContent,
  generateApiSpecContent,
  generateConfigContent,
  generateUiConstantsContent,
  generateUiDemoPageContent,
  generateUiFixturesIndexContent,
  generateUiPageObjectsIndexContent,
  generateUiParallelGlobalSetupContent,
  generateUiParallelSpecContent,
  generateUiSpecContent,
  getCopyrightHeader,
  getScoutPackageImport,
} from '../generator_content';

type TestType = 'ui' | 'api' | 'both';
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
    const apiExampleSpecPath = Path.resolve(apiTestsDir, 'example.spec.ts');
    const apiConstantsPath = Path.resolve(apiFixturesDir, 'constants.ts');
    const apiFixturesIndexPath = Path.resolve(apiFixturesDir, 'index.ts');

    await Fsp.mkdir(apiFixturesDir, { recursive: true });
    log.debug('created dir', apiFixturesDir);
    await Fsp.mkdir(apiTestsDir, { recursive: true });
    log.debug('created dir', apiTestsDir);
    const apiConfigContent = generateConfigContent(scoutPackage, './tests', copyrightHeader);
    await Fsp.writeFile(apiConfigPath, apiConfigContent);
    log.debug('created file', apiConfigPath);
    const apiConstantsContent = generateApiConstantsContent(copyrightHeader);
    await Fsp.writeFile(apiConstantsPath, apiConstantsContent);
    log.debug('created file', apiConstantsPath);
    const apiFixturesIndexContent = generateApiFixturesIndexContent(scoutPackage, copyrightHeader);
    await Fsp.writeFile(apiFixturesIndexPath, apiFixturesIndexContent);
    log.debug('created file', apiFixturesIndexPath);
    const apiSpecContent = generateApiSpecContent(scoutPackage, copyrightHeader);
    await Fsp.writeFile(apiExampleSpecPath, apiSpecContent);
    log.debug('created file', apiExampleSpecPath);
  }

  if (testType === 'ui' || testType === 'both') {
    const uiTestDir = Path.resolve(fullBasePath, 'test/scout/ui');
    const uiFixturesDir = Path.resolve(uiTestDir, 'fixtures');
    const uiPageObjectsDir = Path.resolve(uiFixturesDir, 'page_objects');
    const uiPageObjectsIndexPath = Path.resolve(uiPageObjectsDir, 'index.ts');
    const uiDemoPagePath = Path.resolve(uiPageObjectsDir, 'demo.ts');
    const uiConstantsPath = Path.resolve(uiFixturesDir, 'constants.ts');
    const uiFixturesIndexPath = Path.resolve(uiFixturesDir, 'index.ts');

    if (uiParallel) {
      const uiParallelTestsDir = Path.resolve(uiTestDir, 'parallel_tests');
      const uiConfigPath = Path.resolve(uiTestDir, 'parallel.playwright.config.ts');
      const uiParallelSpecPathOne = Path.resolve(uiParallelTestsDir, 'example_one.spec.ts');
      const uiParallelSpecPathTwo = Path.resolve(uiParallelTestsDir, 'example_two.spec.ts');
      const uiParallelGlobalSetupPath = Path.resolve(uiParallelTestsDir, 'global.setup.ts');

      // create scout/ui/fixtures dir
      await Fsp.mkdir(uiFixturesDir, { recursive: true });
      // create scout/ui/fixtures/page_objects dir
      await Fsp.mkdir(uiPageObjectsDir, { recursive: true });
      // create scout/ui/parallel_tests dir
      await Fsp.mkdir(uiParallelTestsDir, { recursive: true });
      // create scout/ui/parallel.playwright.config.ts file
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
      // create scout/ui/fixtures/constants.ts file
      const uiConstantsContent = generateUiConstantsContent(copyrightHeader);
      await Fsp.writeFile(uiConstantsPath, uiConstantsContent);
      // create scout/ui/fixtures/index.ts file
      const uiFixturesIndexContent = generateUiFixturesIndexContent(
        scoutPackage,
        copyrightHeader,
        true
      );
      await Fsp.writeFile(uiFixturesIndexPath, uiFixturesIndexContent);
      // create scout/ui/fixtures/page_objects/demo.ts file
      const uiDemoPageContent = generateUiDemoPageContent(scoutPackage, copyrightHeader);
      await Fsp.writeFile(uiDemoPagePath, uiDemoPageContent);
      // create scout/ui/fixtures/page_objects/index.ts file
      const uiPageObjectsIndexContent = generateUiPageObjectsIndexContent(copyrightHeader);
      await Fsp.writeFile(uiPageObjectsIndexPath, uiPageObjectsIndexContent);
      // create scout/ui/parallel_tests/example_one.spec.ts file
      const uiParallelSpecContent = generateUiParallelSpecContent(scoutPackage, copyrightHeader);
      await Fsp.writeFile(uiParallelSpecPathOne, uiParallelSpecContent);
      // create scout/ui/parallel_tests/example_two.spec.ts file
      await Fsp.writeFile(uiParallelSpecPathTwo, uiParallelSpecContent);
      // create scout/ui/parallel_tests/global.setup.ts file
      const uiParallelGlobalSetupContent = generateUiParallelGlobalSetupContent(
        scoutPackage,
        copyrightHeader
      );
      await Fsp.writeFile(uiParallelGlobalSetupPath, uiParallelGlobalSetupContent);
    } else {
      const uiTestsDir = Path.resolve(uiTestDir, 'tests');
      const uiConfigPath = Path.resolve(uiTestDir, 'playwright.config.ts');
      const uiSpecPath = Path.resolve(uiTestsDir, 'example.spec.ts');

      // create scout/ui/fixtures dir
      await Fsp.mkdir(uiFixturesDir, { recursive: true });
      // create scout/ui/fixtures/page_objects dir
      await Fsp.mkdir(uiPageObjectsDir, { recursive: true });
      // create scout/ui/tests dir
      await Fsp.mkdir(uiTestsDir, { recursive: true });
      // create scout/ui/playwright.config.ts file
      const uiConfigContent = generateConfigContent(scoutPackage, './tests', copyrightHeader);
      await Fsp.writeFile(uiConfigPath, uiConfigContent);
      // create scout/ui/fixtures/constants.ts file
      const uiConstantsContent = generateUiConstantsContent(copyrightHeader);
      await Fsp.writeFile(uiConstantsPath, uiConstantsContent);
      // create scout/ui/fixtures/index.ts file
      const uiFixturesIndexContent = generateUiFixturesIndexContent(
        scoutPackage,
        copyrightHeader,
        false
      );
      await Fsp.writeFile(uiFixturesIndexPath, uiFixturesIndexContent);
      // create scout/ui/fixtures/page_objects/demo.ts file
      const uiDemoPageContent = generateUiDemoPageContent(scoutPackage, copyrightHeader);
      await Fsp.writeFile(uiDemoPagePath, uiDemoPageContent);
      // create scout/ui/fixtures/page_objects/index.ts file
      const uiPageObjectsIndexContent = generateUiPageObjectsIndexContent(copyrightHeader);
      await Fsp.writeFile(uiPageObjectsIndexPath, uiPageObjectsIndexContent);
      // create scout/ui/tests/example.spec.ts file
      const uiSpecContent = generateUiSpecContent(scoutPackage, copyrightHeader);
      await Fsp.writeFile(uiSpecPath, uiSpecContent);
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

    log.success(
      `Successfully generated Scout test structure for ${Path.posix.join(
        relativePath.replace(/\\\\/g, '/'),
        'test/scout'
      )}`
    );
  },
};
