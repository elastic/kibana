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

function generateUiParallelGlobalSetupContent(
  scoutPackage: string,
  copyrightHeader: string
): string {
  return `${copyrightHeader}import { globalSetupHook } from '${scoutPackage}';
import { testData } from '../fixtures';

globalSetupHook('Ingest data to Elasticsearch', async ({ esArchiver, log }) => {
  // add archives to load, if needed
  const archives = [testData.ES_ARCHIVES.SOME_ARCHIVE];

  log.debug('[setup] loading test data (only if indexes do not exist)...');
  for (const archive of archives) {
    await esArchiver.loadIfNeeded(archive);
  }
});
`;
}

function generateApiSpecContent(scoutPackage: string, copyrightHeader: string): string {
  return `${copyrightHeader}import type { RoleApiCredentials } from '${scoutPackage}';
import { apiTest, expect, tags } from '${scoutPackage}';
import { testData } from '../fixtures';

apiTest.describe('Scout api test suite example', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let adminApiCredentials: RoleApiCredentials;
  apiTest.beforeAll(async ({ requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest('should complete a basic api flow', async ({ apiClient }) => {
    const response = await apiClient.post('kibana/api', {
      headers: {
        ...adminApiCredentials.apiKeyHeader,
        ...testData.COMMON_HEADERS,
      },
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
  });
});
`;
}

function generateApiConstantsContent(copyrightHeader: string): string {
  return `${copyrightHeader}export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};
`;
}

function generateApiFixturesIndexContent(scoutPackage: string, copyrightHeader: string): string {
  return `${copyrightHeader}import type { ScoutTestFixtures, ScoutWorkerFixtures } from '${scoutPackage}';
import { apiTest as baseApiTest } from '${scoutPackage}';

export const apiTest = baseApiTest.extend<ScoutTestFixtures, ScoutWorkerFixtures>({});

export * as testData from './constants';
`;
}

function generateUiSpecContent(scoutPackage: string, copyrightHeader: string): string {
  return `${copyrightHeader}import { expect, tags } from '${scoutPackage}';
import { test, testData } from '../fixtures';

test.describe('Scout ui test suite example', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.SOME_ARCHIVE);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.SOME_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.demo.goto();
  });

  test('should complete a basic user flow', async ({ pageObjects }) => {
    await pageObjects.demo.goto();
    await expect(pageObjects.demo).toBeDefined();
  });
});
`;
}

function generateUiParallelSpecContent(scoutPackage: string, copyrightHeader: string): string {
  return `${copyrightHeader}import { expect, tags } from '${scoutPackage}';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe(
  'Scout parallel ui test suite example',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.SOME_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultTime({
        from: testData.DEFAULT_START_TIME,
        to: testData.DEFAULT_END_TIME,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.demo.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should complete a basic flow', async ({ pageObjects }) => {
      await pageObjects.demo.goto();
      expect(pageObjects.demo).toBeDefined();
    });
  }
);
`;
}

function generateUiConstantsContent(copyrightHeader: string): string {
  return `${copyrightHeader}export const DEFAULT_START_TIME = '2020-01-01T00:00:00.000Z';
export const DEFAULT_END_TIME = '2020-01-02T00:00:00.000Z';

export const ES_ARCHIVES = {
  SOME_ARCHIVE: 'path/to/es_archive',
};

export const KBN_ARCHIVES = {
  SOME_ARCHIVE: 'path/to/kbn_archive',
};
`;
}

function generateUiPageObjectsIndexContent(copyrightHeader: string): string {
  return `${copyrightHeader}export { DemoPage } from './demo';
`;
}

function generateUiDemoPageContent(scoutPackage: string, copyrightHeader: string): string {
  return `${copyrightHeader}import type { ScoutPage } from '${scoutPackage}';

export class DemoPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('not_implemented');
  }
}
`;
}

function generateUiFixturesIndexContent(
  scoutPackage: string,
  copyrightHeader: string,
  includeParallel: boolean
): string {
  if (!includeParallel) {
    return `${copyrightHeader}import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '${scoutPackage}';
import { test as baseTest, createLazyPageObject } from '${scoutPackage}';
import { DemoPage } from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    demo: DemoPage;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtScoutTestFixtures['pageObjects'];
      page: ExtScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      demo: createLazyPageObject(DemoPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
`;
  }

  return `${copyrightHeader}import type {
  PageObjects,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from '${scoutPackage}';
import { test as baseTest, spaceTest as spaceBaseTest, createLazyPageObject } from '${scoutPackage}';
import { DemoPage } from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    demo: DemoPage;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtScoutTestFixtures['pageObjects'];
      page: ExtScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      demo: createLazyPageObject(DemoPage, page),
    };

    await use(extendedPageObjects);
  },
});

export interface ExtParallelRunTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    demo: DemoPage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  ExtParallelRunTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtParallelRunTestFixtures['pageObjects'];
      page: ExtParallelRunTestFixtures['page'];
    },
    use: (pageObjects: ExtParallelRunTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      demo: createLazyPageObject(DemoPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
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

      await Fsp.mkdir(uiFixturesDir, { recursive: true });
      log.debug('created dir', uiFixturesDir);
      await Fsp.mkdir(uiPageObjectsDir, { recursive: true });
      log.debug('created dir', uiPageObjectsDir);
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
      const uiConstantsContent = generateUiConstantsContent(copyrightHeader);
      await Fsp.writeFile(uiConstantsPath, uiConstantsContent);
      log.debug('created file', uiConstantsPath);
      const uiFixturesIndexContent = generateUiFixturesIndexContent(
        scoutPackage,
        copyrightHeader,
        true
      );
      await Fsp.writeFile(uiFixturesIndexPath, uiFixturesIndexContent);
      log.debug('created file', uiFixturesIndexPath);
      const uiDemoPageContent = generateUiDemoPageContent(scoutPackage, copyrightHeader);
      await Fsp.writeFile(uiDemoPagePath, uiDemoPageContent);
      log.debug('created file', uiDemoPagePath);
      const uiPageObjectsIndexContent = generateUiPageObjectsIndexContent(copyrightHeader);
      await Fsp.writeFile(uiPageObjectsIndexPath, uiPageObjectsIndexContent);
      log.debug('created file', uiPageObjectsIndexPath);
      const uiParallelSpecContent = generateUiParallelSpecContent(scoutPackage, copyrightHeader);
      await Fsp.writeFile(uiParallelSpecPathOne, uiParallelSpecContent);
      log.debug('created file', uiParallelSpecPathOne);
      await Fsp.writeFile(uiParallelSpecPathTwo, uiParallelSpecContent);
      log.debug('created file', uiParallelSpecPathTwo);
      const uiParallelGlobalSetupContent = generateUiParallelGlobalSetupContent(
        scoutPackage,
        copyrightHeader
      );
      await Fsp.writeFile(uiParallelGlobalSetupPath, uiParallelGlobalSetupContent);
      log.debug('created file', uiParallelGlobalSetupPath);
    } else {
      const uiTestsDir = Path.resolve(uiTestDir, 'tests');
      const uiConfigPath = Path.resolve(uiTestDir, 'playwright.config.ts');
      const uiSpecPath = Path.resolve(uiTestsDir, 'example.spec.ts');

      await Fsp.mkdir(uiFixturesDir, { recursive: true });
      log.debug('created dir', uiFixturesDir);
      await Fsp.mkdir(uiPageObjectsDir, { recursive: true });
      log.debug('created dir', uiPageObjectsDir);
      await Fsp.mkdir(uiTestsDir, { recursive: true });
      log.debug('created dir', uiTestsDir);
      const uiConfigContent = generateConfigContent(scoutPackage, './tests', copyrightHeader);
      await Fsp.writeFile(uiConfigPath, uiConfigContent);
      log.debug('created file', uiConfigPath);
      const uiConstantsContent = generateUiConstantsContent(copyrightHeader);
      await Fsp.writeFile(uiConstantsPath, uiConstantsContent);
      log.debug('created file', uiConstantsPath);
      const uiFixturesIndexContent = generateUiFixturesIndexContent(
        scoutPackage,
        copyrightHeader,
        false
      );
      await Fsp.writeFile(uiFixturesIndexPath, uiFixturesIndexContent);
      log.debug('created file', uiFixturesIndexPath);
      const uiDemoPageContent = generateUiDemoPageContent(scoutPackage, copyrightHeader);
      await Fsp.writeFile(uiDemoPagePath, uiDemoPageContent);
      log.debug('created file', uiDemoPagePath);
      const uiPageObjectsIndexContent = generateUiPageObjectsIndexContent(copyrightHeader);
      await Fsp.writeFile(uiPageObjectsIndexPath, uiPageObjectsIndexContent);
      log.debug('created file', uiPageObjectsIndexPath);
      const uiSpecContent = generateUiSpecContent(scoutPackage, copyrightHeader);
      await Fsp.writeFile(uiSpecPath, uiSpecContent);
      log.debug('created file', uiSpecPath);
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
