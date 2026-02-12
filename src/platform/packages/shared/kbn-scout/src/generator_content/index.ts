/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

export function getCopyrightHeader(basePath: string): string {
  const normalizedPath = basePath.replace(/\\/g, '/');
  if (normalizedPath.startsWith('x-pack/')) {
    return COPYRIGHT_HEADER_XPACK;
  }
  // Default to src header if path doesn't match 'x-pack/'
  return COPYRIGHT_HEADER_SRC;
}

export function getScoutPackageImport(basePath: string): string {
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

export function generateConfigContent(
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

export function generateUiParallelGlobalSetupContent(
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

export function generateApiSpecContent(scoutPackage: string, copyrightHeader: string): string {
  return `${copyrightHeader}import type { RoleApiCredentials } from '${scoutPackage}';
import { tags } from '${scoutPackage}';
import { expect } from '${scoutPackage}/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Scout API test suite example', { tag: tags.deploymentAgnostic }, () => {
  let viewerApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    viewerApiCredentials = await requestAuth.getApiKey('viewer');
  });

  apiTest('should complete a basic API flow', async ({ apiClient }) => {
    const response = await apiClient.post('kibana/api', {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
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

export function generateApiConstantsContent(copyrightHeader: string): string {
  return `${copyrightHeader}export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};
`;
}

export function generateApiFixturesIndexContent(
  scoutPackage: string,
  copyrightHeader: string
): string {
  return `${copyrightHeader}import type { ScoutTestFixtures, ScoutWorkerFixtures } from '${scoutPackage}';
import { apiTest as baseApiTest } from '${scoutPackage}';

export const apiTest = baseApiTest.extend<ScoutTestFixtures, ScoutWorkerFixtures>({});

export * as testData from './constants';
`;
}

export function generateUiSpecContent(scoutPackage: string, copyrightHeader: string): string {
  return `${copyrightHeader}import { tags } from '${scoutPackage}';
import { expect } from '${scoutPackage}/ui';
import { test, testData } from '../fixtures';

test.describe('Scout ui test suite example', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.SOME_ARCHIVE);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.SOME_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should complete a basic user flow', async ({ pageObjects }) => {
    await pageObjects.demo.goto();
    await expect(pageObjects.demo.pageElement).toBeVisible();
  });
});
`;
}

export function generateUiParallelSpecContent(
  scoutPackage: string,
  copyrightHeader: string
): string {
  return `${copyrightHeader}import { tags } from '${scoutPackage}';
import { expect } from '${scoutPackage}/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe(
  'Scout parallel UI test suite example',
  { tag: tags.deploymentAgnostic },
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
      await expect(pageObjects.demo.pageElement).toBeHidden();
    });
  }
);
`;
}

export function generateUiConstantsContent(copyrightHeader: string): string {
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

export function generateUiPageObjectsIndexContent(copyrightHeader: string): string {
  return `${copyrightHeader}export { DemoPage } from './demo';
`;
}

export function generateUiDemoPageContent(scoutPackage: string, copyrightHeader: string): string {
  return `${copyrightHeader}import type { ScoutPage, Locator } from '${scoutPackage}';

export class DemoPage {
  public someElement: Locator;

  constructor(private readonly page: ScoutPage) {
    this.someElement = this.page.testSubj.locator('some-data-test-subj');
  }

  async goto() {
    await this.page.gotoApp('not_implemented');
  }
}
`;
}

export function generateUiFixturesIndexContent(
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
