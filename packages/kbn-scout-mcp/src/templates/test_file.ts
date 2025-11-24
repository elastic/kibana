/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface TestFileOptions {
  testName: string;
  description: string;
  deploymentTags: string[];
  useSpaceTest: boolean;
  imports: string[];
  fixtures: string[];
  setupCode: string;
  testCode: string;
  cleanupCode: string;
}

export function generateTestFile(options: TestFileOptions): string {
  const {
    testName,
    description,
    deploymentTags,
    useSpaceTest,
    imports,
    fixtures,
    setupCode,
    testCode,
    cleanupCode,
  } = options;

  const testFunction = useSpaceTest ? 'spaceTest' : 'test';
  const importStatement = useSpaceTest
    ? `import { expect, spaceTest } from '@kbn/scout-security';`
    : `import { expect, test } from '@kbn/scout';`;

  const additionalImports = imports.length > 0 ? `\n${imports.join('\n')}` : '';

  const fixturesParam = fixtures.length > 0 ? `{ ${fixtures.join(', ')} }` : '{}';

  return `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

${importStatement}${additionalImports}

${testFunction}.describe('${testName}', { tag: ${JSON.stringify(deploymentTags)} }, () => {
  ${
    setupCode
      ? `${testFunction}.beforeEach(async (${fixturesParam}) => {\n    ${setupCode}\n  });\n\n  `
      : ''
  }${
    cleanupCode
      ? `${testFunction}.afterEach(async (${fixturesParam}) => {\n    ${cleanupCode}\n  });\n\n  `
      : ''
  }${testFunction}('${description}', async (${fixturesParam}) => {
    ${testCode}
  });
});
`;
}
