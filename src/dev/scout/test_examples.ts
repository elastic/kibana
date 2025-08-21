/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface TestExample {
  category: string;
  description: string;
  code: string;
}

export const API_TEST_EXAMPLES: TestExample[] = [
  {
    category: 'Data Management',
    description: 'Simple API test for basic functionality',
    code: `
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, expect, tags } from '@kbn/scout';

apiTest.describe(
  'Basic API Test',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest('should access API endpoint successfully', async ({ apiClient }) => {
      // Navigate: Make API call
      const response = await apiClient.get('api/plugin/endpoint', {
        headers: { ...adminApiCredentials.apiKeyHeader },
      });

      // Validate: Check positive response
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeDefined();
    });
  }
);`,
  },
  {
    category: 'Security',
    description: 'Simple API test for authentication',
    code: `
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, expect, tags } from '@kbn/scout';

apiTest.describe(
  'Authentication Test',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest('should authenticate successfully', async ({ apiClient }) => {
      // Navigate: Access protected endpoint
      const response = await apiClient.get('api/plugin/protected', {
        headers: { ...adminApiCredentials.apiKeyHeader },
      });

      // Validate: Check authentication success
      expect(response.statusCode).toBe(200);
    });
  }
);`,
  },
  {
    category: 'Configuration',
    description: 'Simple API test for configuration',
    code: `
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, expect, tags } from '@kbn/scout';

apiTest.describe(
  'Configuration Test',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest('should retrieve configuration', async ({ apiClient }) => {
      // Navigate: Get configuration
      const response = await apiClient.get('api/plugin/config', {
        headers: { ...adminApiCredentials.apiKeyHeader },
      });

      // Validate: Check configuration exists
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('config');
    });
  }
);`,
  },
];

export const UI_TEST_EXAMPLES: TestExample[] = [
  {
    category: 'Dashboard',
    description: 'Simple UI test for dashboard navigation',
    code: `
import { test, expect, tags } from '@kbn/scout';

test.describe('Basic Dashboard Test', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.common.navigateToApp('dashboard');
  });

  test('should navigate to dashboard successfully', async ({ pageObjects }) => {
    // Action: Wait for page to load
    await pageObjects.dashboard.waitForRenderComplete();
    
    // Validate: Check dashboard page is visible
    await expect(pageObjects.dashboard.getDashboardGrid()).toBeVisible();
  });
});`,
  },
  {
    category: 'Data Exploration',
    description: 'Simple UI test for data discovery',
    code: `
import { test, expect, tags } from '@kbn/scout';

test.describe('Basic Discovery Test', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.common.navigateToApp('discover');
  });

  test('should navigate to discover page', async ({ pageObjects }) => {
    // Action: Wait for discover page to load
    await pageObjects.discover.waitForDocTable();
    
    // Validate: Check discover interface is visible
    await expect(pageObjects.discover.getDocTable()).toBeVisible();
  });
});`,
  },
  {
    category: 'Management',
    description: 'Simple UI test for management interface',
    code: `
import { test, expect, tags } from '@kbn/scout';

test.describe('Basic Management Test', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.common.navigateToApp('management');
  });

  test('should navigate to management page', async ({ pageObjects }) => {
    // Action: Wait for management page to load
    await pageObjects.management.waitForPageLoad();
    
    // Validate: Check management interface is visible
    await expect(pageObjects.management.getSideNav()).toBeVisible();
  });
});`,
  },
];

export function getExamplesByCategory(category: string, testType: 'ui' | 'api'): TestExample[] {
  const examples = testType === 'ui' ? UI_TEST_EXAMPLES : API_TEST_EXAMPLES;
  return examples.filter(
    (example) =>
      example.category.toLowerCase().includes(category.toLowerCase()) ||
      example.description.toLowerCase().includes(category.toLowerCase())
  );
}

export function getAllExamples(testType: 'ui' | 'api'): TestExample[] {
  return testType === 'ui' ? UI_TEST_EXAMPLES : API_TEST_EXAMPLES;
}
