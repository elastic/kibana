/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import path from 'path';
import { callLLM } from './llm_client';
import { stripComments, truncate } from './code_utils';
import { findSourceFileRecursive, parseKibanaJsonc } from './file_utils';

const exampleApiTest = `
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, expect, tags } from '@kbn/scout';

apiTest.describe(
  'POST api/painless_lab/execute',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });
    apiTest('should execute a valid painless script', async ({ apiClient }) => {
      const response = await apiClient.post('api/painless_lab/execute', {
        headers: {
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: TEST_INPUT.script,
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({
        result: 'true',
      });
    });
  }
);
`;

const exampleUiTest = `
import { test, expect, tags } from '@kbn/scout';

test.describe('Painless Lab', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.painlessLab.goto();
    await pageObjects.painlessLab.waitForEditorToLoad();
  });

  test('validate painless lab editor and request', async ({ pageObjects }) => {
    await pageObjects.painlessLab.setCodeEditorValue(TEST_SCRIPT);
    await pageObjects.painlessLab.editorOutputPane.waitFor({ state: 'visible' });
    await expect(pageObjects.painlessLab.editorOutputPane).toContainText(TEST_SCRIPT_RESULT);

    await pageObjects.painlessLab.viewRequestButton.click();
    await expect(pageObjects.painlessLab.requestFlyoutHeader).toBeVisible();

    expect(await pageObjects.painlessLab.getFlyoutRequestBody()).toBe(TEST_SCRIPT_REQUEST);
  });
});
`;

// Helper to strip markdown fences from LLM output
function removeCodeFence(text: string): string {
  return text
    .replace(/^```[a-zA-Z]*\n?/, '') // remove opening fence with optional language
    .replace(/\s*```$/, ''); // remove closing fence
}

export async function generateTestForFile(
  model: string,
  sourceFilePath: string,
  testDirPath: string,
  pluginMeta: any,
  testType: 'ui' | 'api'
) {
  let sourceCode: string;
  try {
    sourceCode = await fs.readFile(sourceFilePath, 'utf-8');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to read source file: ${sourceFilePath}`, error);
    return;
  }

  sourceCode = stripComments(sourceCode);
  sourceCode = truncate(sourceCode, 4000);

  let prompt = '';

  if (testType === 'ui') {
    prompt = `
You are an expert Kibana plugin developer. Search https://www.elastic.co/docs for information about the Kibana plugin named "${pluginMeta.plugin.id}" to understand its usage and features.

Write a complete, executable Playwright UI test file using the @kbn/scout testing library for the "${pluginMeta.plugin.id}" plugin.

Include:
- All necessary imports
- Test suite definitions with descriptive names
- Usage of fake page objects
- Example Playwright actions and assertions using 'expect'

Follow this example to match the style and conventions:

---
${exampleUiTest}
---

Provide only the TypeScript code inside a markdown code block with triple backticks. Do not add any prose or explanation outside the code.
`;
  } else {
    prompt = `
You are an expert Kibana plugin developer. Search https://www.elastic.co/docs for information about the Kibana plugin named "${pluginMeta.plugin.id}" to understand its API and functionality.

Write a complete, executable Scout API test file using the @kbn/scout API test library for the "${pluginMeta.plugin.id}" plugin.

Include:
- All necessary imports
- Test suite definitions with descriptive names
- Example fake API client calls and assertions with 'expect'

Follow this example to match the style and conventions:

---
${exampleApiTest}
---

Provide only the TypeScript code inside a markdown code block with triple backticks. Do not add any prose or explanation outside the code.
`;
  }

  let testCodeRaw: string;
  try {
    testCodeRaw = await callLLM(model, prompt);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error generating test code with LLM:', error);
    return;
  }

  const testCode = removeCodeFence(testCodeRaw).trim();

  if (!testCode) {
    // eslint-disable-next-line no-console
    console.warn('Warning: Extracted test code is empty.');
    return;
  }

  try {
    await fs.mkdir(testDirPath, { recursive: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to create test directory: ${testDirPath}`, error);
    return;
  }

  const origExt = testType === 'ui' ? /\.(jsx?|tsx?)$/ : /\.(js|ts)$/;
  const baseName = path.basename(sourceFilePath).replace(origExt, `.spec.ts`);
  const testFilePath = path.join(testDirPath, baseName);

  try {
    await fs.writeFile(testFilePath, testCode, 'utf-8');
    // eslint-disable-next-line no-console
    console.log(`Test generated and saved to: ${testFilePath}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to write test file: ${testFilePath}`, error);
  }
}

export async function analyzeAndGenerate(pluginPath: string) {
  let pluginMeta: any;
  try {
    pluginMeta = await parseKibanaJsonc(pluginPath);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to parse kibana.jsonc at ${pluginPath}`, error);
    return;
  }

  if (pluginMeta?.plugin?.browser) {
    const publicDir = path.join(pluginPath, 'public');
    const testUIPath = path.join(pluginPath, 'test', 'scout', 'ui');
    try {
      const stats = await fs.stat(publicDir);
      if (!stats.isDirectory()) {
        // eslint-disable-next-line no-console
        console.log(`Public path exists but is not a directory: ${publicDir}`);
      } else {
        const sourceFile = await findSourceFileRecursive(publicDir, ['.tsx', '.jsx']);
        if (sourceFile) {
          await generateTestForFile('codellama', sourceFile, testUIPath, pluginMeta, 'ui');
        } else {
          // eslint-disable-next-line no-console
          console.log(`No UI (.tsx/.jsx) source files found in ${publicDir}`);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error accessing or reading public directory at ${publicDir}`, error);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('browser:false in kibana.jsonc; skipping UI test generation.');
  }

  if (pluginMeta?.plugin?.server) {
    const serverDir = path.join(pluginPath, 'server');
    const testApiPath = path.join(pluginPath, 'test', 'scout', 'api');
    try {
      const stats = await fs.stat(serverDir);
      if (!stats.isDirectory()) {
        // eslint-disable-next-line no-console
        console.log(`Server path exists but is not a directory: ${serverDir}`);
      } else {
        const sourceFile = await findSourceFileRecursive(serverDir, ['.ts', '.js']);
        if (sourceFile) {
          await generateTestForFile('codellama', sourceFile, testApiPath, pluginMeta, 'api');
        } else {
          // eslint-disable-next-line no-console
          console.log(`No API (.ts/.js) source files found in ${serverDir}`);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error accessing or reading server directory at ${serverDir}`, error);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('server:false in kibana.jsonc; skipping API test generation.');
  }
}
