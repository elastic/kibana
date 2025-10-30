/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformPlaywrightCode } from './transformer';
import type { TransformOptions, SelectorMapping } from './types';

describe('transformPlaywrightCode', () => {
  const baseOptions: TransformOptions = {
    scoutPackage: '@kbn/scout',
    useSpaceTest: false,
    deploymentTags: ["'@ess'"],
    role: 'admin',
  };

  describe('import transformation', () => {
    it('should replace Playwright imports with Scout imports', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601');
});`;

      const result = transformPlaywrightCode(input, baseOptions);

      expect(result.code).toContain("import { test, expect } from '@kbn/scout';");
      expect(result.code).not.toContain('@playwright/test');
    });

    it('should use spaceTest when parallel option is true', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601');
});`;

      const result = transformPlaywrightCode(input, {
        ...baseOptions,
        useSpaceTest: true,
      });

      expect(result.code).toContain("import { spaceTest as test, expect } from '@kbn/scout';");
    });

    it('should use correct Scout package for observability', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601');
});`;

      const result = transformPlaywrightCode(input, {
        ...baseOptions,
        scoutPackage: '@kbn/scout-oblt',
      });

      expect(result.code).toContain("import { test, expect } from '@kbn/scout-oblt';");
    });
  });

  describe('fixture addition', () => {
    it('should add Scout fixtures to test function', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601');
});`;

      const result = transformPlaywrightCode(input, baseOptions);

      expect(result.code).toContain('async ({ page, pageObjects, browserAuth })');
    });

    it('should add fixtures even when no page fixture exists', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async () => {
  console.log('test');
});`;

      const result = transformPlaywrightCode(input, baseOptions);

      expect(result.code).toContain('async ({ page, pageObjects, browserAuth })');
    });
  });

  describe('authentication detection', () => {
    it('should detect and remove login flow', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601/login');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]');
  await page.goto('http://localhost:5601/app/discover');
});`;

      const result = transformPlaywrightCode(input, baseOptions);

      expect(result.code).not.toContain('/login');
      expect(result.code).not.toContain('username');
      expect(result.code).not.toContain('password');
      expect(result.detectedPatterns).toContain(
        'Authentication flow detected and converted to browserAuth fixture'
      );
    });

    it('should add browserAuth.loginAs in beforeEach', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601/login');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'password');
  await page.goto('http://localhost:5601/app/discover');
});`;

      const result = transformPlaywrightCode(input, baseOptions);

      expect(result.code).toContain('test.beforeEach');
      expect(result.code).toContain("browserAuth.loginAs('admin')");
    });
  });

  describe('selector replacement', () => {
    it('should replace CSS selectors with testSubj', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.locator('.save-button').click();
  await page.fill('#name-input', 'My Name');
});`;

      const selectorMappings: SelectorMapping[] = [
        { cssSelector: '.save-button', testSubj: 'saveButton' },
        { cssSelector: '#name-input', testSubj: 'nameInput' },
      ];

      const result = transformPlaywrightCode(input, baseOptions, selectorMappings);

      expect(result.code).toContain("page.testSubj.locator('saveButton')");
      expect(result.code).toContain("page.testSubj.fill('nameInput'");
      expect(result.detectedPatterns.some((p) => p.includes('data-test-subj'))).toBe(true);
    });
  });

  describe('page object detection', () => {
    it('should detect and replace discover navigation', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601/app/discover');
  await page.click('[data-test-subj="discoverSaveButton"]');
});`;

      const result = transformPlaywrightCode(input, baseOptions);

      expect(result.code).toContain('pageObjects.discover.goto()');
      expect(result.detectedPatterns.some((p) => p.includes('discover'))).toBe(true);
    });

    it('should detect and replace dashboard navigation', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601/app/dashboards');
});`;

      const result = transformPlaywrightCode(input, baseOptions);

      expect(result.code).toContain('pageObjects.dashboard.goto()');
      expect(result.detectedPatterns.some((p) => p.includes('dashboard'))).toBe(true);
    });
  });

  describe('test structure', () => {
    it('should wrap test in describe block with tags', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601/app/discover');
});`;

      const result = transformPlaywrightCode(input, baseOptions);

      expect(result.code).toContain("test.describe('Generated test suite'");
      expect(result.code).toContain("tag: ['@ess']");
    });

    it('should use correct tags for serverless', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601/app/discover');
});`;

      const result = transformPlaywrightCode(input, {
        ...baseOptions,
        deploymentTags: ["'@svlOblt'"],
      });

      expect(result.code).toContain("tag: ['@svlOblt']");
    });
  });

  describe('warnings', () => {
    it('should warn about hardcoded waits', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('http://localhost:5601');
  await page.waitForTimeout(5000);
});`;

      const result = transformPlaywrightCode(input, baseOptions);

      expect(result.warnings).toContain(
        'Test contains hardcoded waits (waitForTimeout) - replace with specific conditions'
      );
    });

    it('should warn about CSS selectors', () => {
      const input = `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.locator('.my-button').click();
});`;

      const result = transformPlaywrightCode(input, baseOptions);

      expect(result.warnings).toContain(
        'Test uses CSS selectors - consider using data-test-subj attributes instead'
      );
    });
  });
});
