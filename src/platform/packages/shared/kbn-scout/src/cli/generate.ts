/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
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
import {
  getScoutCiConfigModuleFromPath,
  upsertEnabledModuleInScoutCiConfigYml,
} from './scout_ci_config';

const TEST_TYPES = ['ui', 'api', 'both'] as const;
type TestType = (typeof TEST_TYPES)[number];

function normalizeScoutRoot(scoutRootRaw: string): string {
  const normalized = scoutRootRaw.trim().replace(/\\/g, '/');
  const stripped = normalized.startsWith('test/') ? normalized.slice('test/'.length) : normalized;

  if (!stripped) {
    throw createFlagError(`--scout-root cannot be empty`);
  }

  if (stripped.includes('/')) {
    throw createFlagError(`--scout-root must be a directory name under "test/" (e.g. "scout")`);
  }

  if (!/^scout(?:_[a-z0-9_]+)?$/.test(stripped)) {
    throw createFlagError(
      `--scout-root must match "scout" or "scout_<configSet>", got "${stripped}"`
    );
  }

  return stripped;
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
  } catch (error) {
    return error instanceof Error ? error.message : 'Path does not match supported patterns';
  }

  // Ensure the user is pointing at a module root (not a subdirectory).
  try {
    const kibanaJsoncPath = Path.resolve(fullPath, 'kibana.jsonc');
    const stat = await Fsp.stat(kibanaJsoncPath);
    if (!stat.isFile()) {
      return 'Path must contain a kibana.jsonc file';
    }

    return true;
  } catch (error) {
    return 'Path must point at a Kibana plugin/package root containing kibana.jsonc';
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await Fsp.stat(targetPath);
    return true;
  } catch (error) {
    return false;
  }
}

async function createDirectoryStructure(
  basePath: string,
  opts: { scoutRoot: string; generateApi: boolean; generateUi: boolean; uiParallel: boolean }
): Promise<void> {
  const fullBasePath = Path.resolve(REPO_ROOT, basePath);
  const scoutRootDir = Path.resolve(fullBasePath, 'test', opts.scoutRoot);
  const scoutPackage = getScoutPackageImport(basePath);
  const copyrightHeader = getCopyrightHeader(basePath);

  if (opts.generateApi) {
    const apiTestDir = Path.resolve(scoutRootDir, 'api');
    const apiFixturesDir = Path.resolve(apiTestDir, 'fixtures');
    const apiTestsDir = Path.resolve(apiTestDir, 'tests');
    const apiConfigPath = Path.resolve(apiTestDir, 'playwright.config.ts');
    const apiExampleSpecPath = Path.resolve(apiTestsDir, 'example.spec.ts');
    const apiConstantsPath = Path.resolve(apiFixturesDir, 'constants.ts');
    const apiFixturesIndexPath = Path.resolve(apiFixturesDir, 'index.ts');

    // create scout/api/fixtures dir
    await Fsp.mkdir(apiFixturesDir, { recursive: true });
    // create scout/api/tests dir
    await Fsp.mkdir(apiTestsDir, { recursive: true });
    // create scout/api/playwright.config.ts file
    const apiConfigContent = generateConfigContent(scoutPackage, './tests', copyrightHeader);
    await Fsp.writeFile(apiConfigPath, apiConfigContent);
    // create scout/api/fixtures/constants.ts file
    const apiConstantsContent = generateApiConstantsContent(copyrightHeader);
    await Fsp.writeFile(apiConstantsPath, apiConstantsContent);
    // create scout/api/fixtures/index.ts file
    const apiFixturesIndexContent = generateApiFixturesIndexContent(scoutPackage, copyrightHeader);
    await Fsp.writeFile(apiFixturesIndexPath, apiFixturesIndexContent);
    // create scout/api/tests/example.spec.ts file
    const apiSpecContent = generateApiSpecContent(scoutPackage, copyrightHeader);
    await Fsp.writeFile(apiExampleSpecPath, apiSpecContent);
  }

  if (opts.generateUi) {
    const uiTestDir = Path.resolve(scoutRootDir, 'ui');
    const uiFixturesDir = Path.resolve(uiTestDir, 'fixtures');
    const uiPageObjectsDir = Path.resolve(uiFixturesDir, 'page_objects');
    const uiPageObjectsIndexPath = Path.resolve(uiPageObjectsDir, 'index.ts');
    const uiDemoPagePath = Path.resolve(uiPageObjectsDir, 'demo.ts');
    const uiConstantsPath = Path.resolve(uiFixturesDir, 'constants.ts');
    const uiFixturesIndexPath = Path.resolve(uiFixturesDir, 'index.ts');

    if (opts.uiParallel) {
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

async function enableModuleInScoutCiConfig(relativePath: string, log: ToolingLog): Promise<void> {
  const module = getScoutCiConfigModuleFromPath(relativePath);
  const scoutCiConfigPath = Path.resolve(REPO_ROOT, '.buildkite', 'scout_ci_config.yml');

  const existing = await Fsp.readFile(scoutCiConfigPath, 'utf8');
  const result = upsertEnabledModuleInScoutCiConfigYml(existing, module);

  if (!result.didChange) {
    log.info(
      `Scout CI config already enabled: ${module.kind} / ${module.name} in .buildkite/scout_ci_config.yml`
    );
    return;
  }

  await Fsp.writeFile(scoutCiConfigPath, result.updatedYml);

  const action = result.movedFromDisabled ? 'moved to enabled' : 'added to enabled';
  log.success(
    `Updated .buildkite/scout_ci_config.yml (${action}): ${module.kind} / ${module.name}`
  );
}

export const generateCmd: Command<void> = {
  name: 'generate',
  description: `
  Generate Scout test directory structure for a plugin or package.

  Interactive prompts are used by default. To run non-interactively, pass --path
  (and optionally --type / --scout-root / --no-ui-parallel / --force).

  It creates the appropriate directory structure and Playwright config files.
  It also registers the module under "enabled" in .buildkite/scout_ci_config.yml so the
  generated configs can run in CI.
  `,
  flags: {
    string: ['path', 'type', 'scout-root'],
    boolean: ['force', 'ui-parallel'],
    alias: {
      p: 'path',
      t: 'type',
      y: 'force',
    },
    default: {
      'ui-parallel': true,
    },
    help: `
    --path             Relative path to the plugin or package (e.g. x-pack/platform/plugins/shared/maps)
    --type             Test type to generate: api | ui | both
    --scout-root       Directory name under <path>/test/ (default: scout). Example: scout_uiam_local
    --ui-parallel      For UI scaffolds, generate parallel tests (default: true). Use --no-ui-parallel for sequential.
    --force            If some Scout directories already exist, generate only the missing sections without prompting
  `,
    examples: `
    node scripts/scout.js generate --path x-pack/platform/plugins/shared/maps --type api
    node scripts/scout.js generate --path x-pack/platform/plugins/shared/maps --type ui --no-ui-parallel
    node scripts/scout.js generate --path x-pack/platform/plugins/shared/security --type both --scout-root scout_uiam_local --force
  `,
  },
  run: async ({ flagsReader, log }) => {
    const positionals = flagsReader.getPositionals();

    const pathFromFlag = flagsReader.string('path');
    const pathFromPositional = positionals[0];
    if (pathFromFlag && pathFromPositional) {
      throw createFlagError(
        `Provide the path either as a positional argument or via --path, not both`
      );
    }

    const isNonInteractive = Boolean(pathFromFlag || pathFromPositional);

    let relativePath: string = '';

    if (isNonInteractive) {
      relativePath = (pathFromFlag ?? pathFromPositional)?.trim() ?? '';
      const validationResult = await validatePath(relativePath);
      if (validationResult !== true) {
        throw createFlagError(validationResult as string);
      }
    } else {
      while (true) {
        const pathResult = await inquirer.prompt<{ path: string }>({
          type: 'input',
          name: 'path',
          message:
            'What is the relative path to the plugin or package? (e.g., x-pack/platform/plugins/shared/maps):',
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
    }

    log.info(`Validated path: ${relativePath}`);

    const basePath = Path.resolve(REPO_ROOT, relativePath);
    const scoutRoot = normalizeScoutRoot(flagsReader.string('scout-root') ?? 'scout');

    const scoutDir = Path.resolve(basePath, 'test', scoutRoot);
    const apiDir = Path.resolve(scoutDir, 'api');
    const uiDir = Path.resolve(scoutDir, 'ui');

    const scoutDirExists = await pathExists(scoutDir);
    const apiDirExists = await pathExists(apiDir);
    const uiDirExists = await pathExists(uiDir);

    if (apiDirExists && uiDirExists) {
      log.warning(
        `Both test/${scoutRoot}/api and test/${scoutRoot}/ui already exist. The generator will not modify existing sub-directories.`
      );
      return;
    }

    const force = flagsReader.boolean('force');
    if (scoutDirExists || apiDirExists || uiDirExists) {
      const existingDirs: string[] = [];
      if (apiDirExists) {
        existingDirs.push(`test/${scoutRoot}/api`);
      }
      if (uiDirExists) {
        existingDirs.push(`test/${scoutRoot}/ui`);
      }
      if (existingDirs.length === 0 && scoutDirExists) {
        existingDirs.push(`test/${scoutRoot}`);
      }
      log.warning(
        `Existing Scout test directories found: ${existingDirs.join(
          ', '
        )}. The generator will not modify existing sub-directories.`
      );

      if (!force) {
        if (isNonInteractive) {
          throw createFlagError(
            `Rerun with --force to generate only the missing sections under test/${scoutRoot}/`
          );
        }

        const continueResult = await inquirer.prompt<{ proceed: boolean }>({
          type: 'list',
          name: 'proceed',
          message: 'Do you want to continue and generate only missing sections?',
          default: false,
          choices: [
            { name: 'No', value: false },
            { name: 'Yes', value: true },
          ],
        });

        if (!continueResult.proceed) {
          log.info('Aborted.');
          return;
        }
      }
    }

    const apiMissing = !apiDirExists;
    const uiMissing = !uiDirExists;

    if (!apiMissing && !uiMissing) {
      log.warning('All Scout test directories already exist. Nothing to generate.');
      return;
    }

    const requestedType = flagsReader.enum('type', TEST_TYPES) as TestType | undefined;

    let testType: TestType;
    if (requestedType) {
      if (requestedType === 'api' && !apiMissing) {
        throw createFlagError(
          `test/${scoutRoot}/api already exists. The generator will not modify existing sub-directories.`
        );
      }
      if (requestedType === 'ui' && !uiMissing) {
        throw createFlagError(
          `test/${scoutRoot}/ui already exists. The generator will not modify existing sub-directories.`
        );
      }
      testType = requestedType;
    } else if (isNonInteractive) {
      testType = apiMissing ? 'api' : 'ui';
    } else {
      const testTypeChoices: Array<{ name: string; value: TestType }> = [];
      if (apiMissing) {
        testTypeChoices.push({ name: 'API tests', value: 'api' });
      }
      if (uiMissing) {
        testTypeChoices.push({ name: 'UI tests', value: 'ui' });
      }
      if (apiMissing && uiMissing) {
        testTypeChoices.push({ name: 'Both API and UI tests', value: 'both' });
      }

      const testTypeResult = await inquirer.prompt<{ testType: TestType }>({
        type: 'list',
        name: 'testType',
        message: 'What type of tests do you plan to add?',
        default: apiMissing ? 'api' : 'ui',
        choices: testTypeChoices,
      });
      testType = testTypeResult.testType;
    }

    log.info(`Selected test type: ${testType}`);

    const shouldGenerateApi = apiMissing && (testType === 'api' || testType === 'both');
    const shouldGenerateUi = uiMissing && (testType === 'ui' || testType === 'both');

    let uiParallel = false;
    if (shouldGenerateUi) {
      if (isNonInteractive) {
        uiParallel = flagsReader.boolean('ui-parallel');
      } else {
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
      }
      log.info(`UI tests parallel: ${uiParallel}`);
    }

    log.info('Creating directory structure...');
    await createDirectoryStructure(relativePath, {
      scoutRoot,
      generateApi: shouldGenerateApi,
      generateUi: shouldGenerateUi,
      uiParallel,
    });

    log.success(
      `Successfully generated Scout test structure for ${Path.posix.join(
        relativePath.replace(/\\\\/g, '/'),
        `test/${scoutRoot}`
      )}`
    );
    log.write('\n');

    await enableModuleInScoutCiConfig(relativePath, log);
  },
};
