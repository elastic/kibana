/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TransformOptions, TransformResult, SelectorMapping } from './types';

/**
 * Page object patterns for detection
 */
const PAGE_OBJECT_PATTERNS = [
  {
    name: 'discover',
    urlPattern: /\/app\/discover/,
    gotoMethod: 'pageObjects.discover.goto()',
    testSubjPatterns: ['discover', 'discoverSaveButton', 'discoverNewButton'],
  },
  {
    name: 'dashboard',
    urlPattern: /\/app\/dashboards/,
    gotoMethod: 'pageObjects.dashboard.goto()',
    testSubjPatterns: ['dashboard', 'dashboardLandingPage', 'dashboardSaveButton'],
  },
  {
    name: 'maps',
    urlPattern: /\/app\/maps/,
    gotoMethod: 'pageObjects.maps.goto()',
    testSubjPatterns: ['mapApp', 'mapSaveButton'],
  },
];

/**
 * Transforms Playwright-generated code to Scout format
 */
export function transformPlaywrightCode(
  playwrightCode: string,
  options: TransformOptions,
  selectorMappings: SelectorMapping[] = []
): TransformResult {
  const detectedPatterns: string[] = [];
  const warnings: string[] = [];

  let code = playwrightCode;

  // Step 1: Transform imports
  code = transformImports(code, options);

  // Step 2: Transform test structure and add fixtures
  const { code: codeWithFixtures, hasAuthDetected } = transformTestStructure(code, options);
  code = codeWithFixtures;

  if (hasAuthDetected) {
    detectedPatterns.push('Authentication flow detected and converted to browserAuth fixture');
  }

  // Step 3: Replace selectors with data-test-subj where possible
  const { code: codeWithSelectors, replacedCount } = replaceSelectorsWithTestSubj(
    code,
    selectorMappings
  );
  code = codeWithSelectors;

  if (replacedCount > 0) {
    detectedPatterns.push(`Converted ${replacedCount} selectors to use data-test-subj attributes`);
  }

  // Step 4: Detect and replace page object patterns
  const { code: codeWithPageObjects, detectedPageObjects } = detectPageObjectPatterns(code);
  code = codeWithPageObjects;

  if (detectedPageObjects.length > 0) {
    detectedPatterns.push(
      `Detected page objects: ${detectedPageObjects.join(', ')} (consider using them)`
    );
  }

  // Step 5: Wrap in test.describe with tags
  code = addScoutStructure(code, options);

  // Step 6: Add warnings for common issues
  if (code.includes('waitForTimeout')) {
    warnings.push(
      'Test contains hardcoded waits (waitForTimeout) - replace with specific conditions'
    );
  }

  if (code.includes('page.locator(') && !code.includes('page.testSubj')) {
    warnings.push('Test uses CSS selectors - consider using data-test-subj attributes instead');
  }

  return {
    code,
    detectedPatterns,
    warnings,
  };
}

/**
 * Transforms import statements
 */
function transformImports(code: string, options: TransformOptions): string {
  const testImport = options.useSpaceTest
    ? `import { spaceTest as test, expect } from '${options.scoutPackage}';`
    : `import { test, expect } from '${options.scoutPackage}';`;

  // Replace Playwright import with Scout import
  return code.replace(
    /import\s*{\s*test\s*,\s*expect\s*}\s*from\s*['"]@playwright\/test['"]\s*;?/,
    testImport
  );
}

/**
 * Transforms test structure and adds Scout fixtures
 */
function transformTestStructure(
  code: string,
  options: TransformOptions
): { code: string; hasAuthDetected: boolean } {
  let result = code;
  let hasAuthDetected = false;

  // Detect authentication steps
  const authPattern =
    /await page\.goto\([^)]*\/login[^)]*\)|await page\.fill\([^)]*username[^)]*\)|await page\.fill\([^)]*password[^)]*\)/gi;
  if (authPattern.test(code)) {
    hasAuthDetected = true;
    // Remove auth-related lines
    result = result.replace(/\s*await page\.goto\([^)]*\/login[^)]*\);?/g, '');
    result = result.replace(/\s*await page\.fill\([^)]*username[^)]*\);?/g, '');
    result = result.replace(/\s*await page\.fill\([^)]*password[^)]*\);?/g, '');
    result = result.replace(/\s*await page\.click\([^)]*login[^)]*button[^)]*\);?/gi, '');
  }

  // Add fixtures to test function signatures
  result = result.replace(
    /test\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\s*{\s*page\s*}\s*\)/g,
    "test('$1', async ({ page, pageObjects, browserAuth })"
  );

  // If no page fixture was present, add all fixtures
  result = result.replace(
    /test\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\s*\)\s*=>/g,
    "test('$1', async ({ page, pageObjects, browserAuth }) =>"
  );

  return { code: result, hasAuthDetected };
}

/**
 * Replaces CSS selectors with data-test-subj equivalents
 */
function replaceSelectorsWithTestSubj(
  code: string,
  mappings: SelectorMapping[]
): { code: string; replacedCount: number } {
  let result = code;
  let replacedCount = 0;

  for (const mapping of mappings) {
    // Escape special regex characters in CSS selector
    const escapedSelector = mapping.cssSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace page.locator('selector') with page.testSubj.locator('testSubj')
    const locatorPattern = new RegExp(
      `page\\.locator\\(\\s*['"\`]${escapedSelector}['"\`]\\s*\\)`,
      'g'
    );
    const locatorReplacement = `page.testSubj.locator('${mapping.testSubj}')`;

    if (locatorPattern.test(result)) {
      result = result.replace(locatorPattern, locatorReplacement);
      replacedCount++;
    }

    // Replace page.click('selector') with page.testSubj.click('testSubj')
    const clickPattern = new RegExp(
      `page\\.click\\(\\s*['"\`]${escapedSelector}['"\`]\\s*\\)`,
      'g'
    );
    const clickReplacement = `page.testSubj.click('${mapping.testSubj}')`;

    if (clickPattern.test(result)) {
      result = result.replace(clickPattern, clickReplacement);
      replacedCount++;
    }

    // Replace page.fill('selector', ...) with page.testSubj.fill('testSubj', ...)
    const fillPattern = new RegExp(`page\\.fill\\(\\s*['"\`]${escapedSelector}['"\`]\\s*,`, 'g');
    const fillReplacement = `page.testSubj.fill('${mapping.testSubj}',`;

    if (fillPattern.test(result)) {
      result = result.replace(fillPattern, fillReplacement);
      replacedCount++;
    }
  }

  return { code: result, replacedCount };
}

/**
 * Detects page object patterns and suggests replacements
 */
function detectPageObjectPatterns(code: string): {
  code: string;
  detectedPageObjects: string[];
} {
  let result = code;
  const detectedPageObjects: string[] = [];

  for (const pattern of PAGE_OBJECT_PATTERNS) {
    // Check if URL pattern matches
    const urlRegex = new RegExp(
      `page\\.goto\\([^)]*${pattern.urlPattern.source.replace(/\\\//g, '/')}[^)]*\\)`,
      'g'
    );

    if (urlRegex.test(code)) {
      detectedPageObjects.push(pattern.name);

      // Replace page.goto with page object method
      result = result.replace(urlRegex, `await ${pattern.gotoMethod}`);
    }

    // Check for test-subj patterns that indicate this page object
    for (const testSubjPattern of pattern.testSubjPatterns) {
      if (code.includes(testSubjPattern)) {
        if (!detectedPageObjects.includes(pattern.name)) {
          detectedPageObjects.push(pattern.name);
        }
      }
    }
  }

  return { code: result, detectedPageObjects };
}

/**
 * Wraps test code in Scout structure with describe block and tags
 */
function addScoutStructure(code: string, options: TransformOptions): string {
  const tags = options.deploymentTags.join(', ');

  // Extract test functions
  const testMatch = code.match(/test\([^{]+{[\s\S]*}\);/g);

  if (!testMatch) {
    return code;
  }

  // Check if already wrapped in describe
  if (code.includes('test.describe')) {
    return code;
  }

  // Get imports
  const importMatch = code.match(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"]\s*;/);
  const imports = importMatch ? importMatch[0] : '';

  // Build describe block
  const testCode = testMatch.join('\n\n  ');

  const structure = `${imports}

test.describe('Generated test suite', { tag: [${tags}] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAs('${options.role}');
  });

  ${testCode}
});
`;

  return structure;
}
