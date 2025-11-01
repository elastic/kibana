/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { subj } from '@kbn/test-subj-selector';
import type { ScoutSession } from '../session';
import type {
  NavigateParams,
  ClickParams,
  TypeParams,
  SnapshotParams,
  ScreenshotParams,
  WaitForParams,
  ToolResult,
} from '../types';
import {
  formatScreenshotFilename,
  validateAndSanitizeUrl,
  validateTextInput,
  ResponseBuilder,
} from '../utils';

/**
 * Navigate to a URL or Kibana app
 */
export async function scoutNavigate(
  session: ScoutSession,
  params: NavigateParams
): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  try {
    const page = await session.getPage();
    const baseUrl = session.getTargetUrl();
    let targetUrl: string;
    let codeSnippet: string;

    if (params.url) {
      // Validate URL to prevent SSRF
      const sanitizedUrl = validateAndSanitizeUrl(params.url, baseUrl);
      await page.goto(sanitizedUrl);
      targetUrl = sanitizedUrl;
      codeSnippet = `await page.goto('${sanitizedUrl}');`;
      response.setResult(`Successfully navigated to ${sanitizedUrl}`);
    } else if (params.app) {
      // Validate app name contains only safe characters
      if (!/^[a-zA-Z0-9_-]+$/.test(params.app)) {
        throw new Error('Invalid app name: contains unsafe characters');
      }

      // Validate path parameter
      let safePath = params.path || '';
      if (safePath) {
        // Ensure path doesn't contain path traversal
        if (safePath.includes('..') || safePath.includes('//')) {
          throw new Error('Invalid path: path traversal detected');
        }
        // Ensure path starts with /
        if (!safePath.startsWith('/')) {
          safePath = '/' + safePath;
        }
      }

      targetUrl = `${baseUrl}/app/${params.app}${safePath}`;
      await page.goto(targetUrl);
      codeSnippet = `await page.goto('${baseUrl}/app/${params.app}${safePath}');`;
      response.setResult(`Successfully navigated to Kibana app: ${params.app}${safePath}`);
      response.setKibanaState(params.app, safePath);
    } else {
      return response.setError('Either url or app parameter must be provided').buildAsToolResult();
    }

    // Add executed code for transparency
    response.addCode(codeSnippet);

    // Add current page state with ARIA snapshot
    const title = await page.title();
    const url = page.url();
    const snapshot = await session.getAriaSnapshot();
    response.setPageState(url, title, snapshot);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response.setError(`Navigation failed: ${message}`).buildAsToolResult();
  }
}

/**
 * Click an element by test subject, selector, or element reference
 */
export async function scoutClick(session: ScoutSession, params: ClickParams): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  // Validate at least one targeting method is provided
  if (!params.testSubj && !params.selector) {
    return response
      .setError('Either testSubj or selector parameter must be provided.')
      .buildAsToolResult();
  }

  try {
    const page = await session.getPage();
    let targetDescription: string;
    let codeSnippet: string;

    if (params.testSubj) {
      const selector = subj(params.testSubj);
      await page.locator(selector).click();
      targetDescription = params.element || `element with test subject: ${params.testSubj}`;
      codeSnippet = `await page.locator('[data-test-subj="${params.testSubj}"]').click();`;
      response.setResult(`Successfully clicked ${targetDescription}`);
    } else if (params.selector) {
      await page.locator(params.selector).click();
      targetDescription = params.element || `element with selector: ${params.selector}`;
      codeSnippet = `await page.locator('${params.selector}').click();`;
      response.setResult(`Successfully clicked ${targetDescription}`);
    }

    // Add executed code
    response.addCode(codeSnippet!);

    // Add updated page state
    const title = await page.title();
    const url = page.url();
    const snapshot = await session.getAriaSnapshot();
    response.setPageState(url, title, snapshot);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Provide helpful error guidance based on the error type
    if (message.includes('Timeout') || message.includes('not found')) {
      return response
        .setError(`Click failed: Element not found - ${message}`)
        .addSection(
          'Suggestion',
          'The element may not be visible or the page may have changed. Use the snapshot tool to see the current page state and available elements.'
        )
        .buildAsToolResult();
    }

    return response.setError(`Click failed: ${message}`).buildAsToolResult();
  }
}

/**
 * Type text into an element
 */
export async function scoutType(session: ScoutSession, params: TypeParams): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  // Validate at least one targeting method is provided
  if (!params.testSubj && !params.selector) {
    return response
      .setError('Either testSubj or selector parameter must be provided.')
      .buildAsToolResult();
  }

  if (!params.text) {
    return response.setError('text parameter is required').buildAsToolResult();
  }

  // Validate text input length
  try {
    validateTextInput(params.text);
  } catch (err) {
    return response
      .setError(err instanceof Error ? err.message : 'Invalid text input')
      .buildAsToolResult();
  }

  try {
    const page = await session.getPage();
    let targetDescription: string = '';
    let codeSnippet: string = '';
    let locator;

    if (params.testSubj) {
      const selector = subj(params.testSubj);
      locator = page.locator(selector);
      targetDescription = params.element || `element with test subject: ${params.testSubj}`;
    } else if (params.selector) {
      locator = page.locator(params.selector);
      targetDescription = params.element || `element with selector: ${params.selector}`;
    }

    if (!locator) {
      throw new Error('Locator not found');
    }

    // Clear existing content first
    await locator.clear();

    const locatorStr = params.selector || `[data-test-subj="${params.testSubj}"]`;

    // Type the text
    if (params.slowly) {
      await locator.pressSequentially(params.text, { delay: 100 });
      codeSnippet = `await page.locator('${locatorStr}').pressSequentially('${params.text}', { delay: 100 });`;
    } else {
      await locator.fill(params.text);
      codeSnippet = `await page.locator('${locatorStr}').fill('${params.text}');`;
    }

    // Submit if requested
    if (params.submit) {
      await locator.press('Enter');
      codeSnippet += `\nawait page.keyboard.press('Enter');`;
    }

    response.setResult(
      `Successfully typed text into ${targetDescription}${params.submit ? ' and submitted' : ''}`
    );
    response.addCode(codeSnippet);

    // Add updated page state
    const title = await page.title();
    const url = page.url();
    const snapshot = await session.getAriaSnapshot();
    response.setPageState(url, title, snapshot);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Provide helpful error guidance
    if (message.includes('Timeout') || message.includes('not found')) {
      return response
        .setError(`Type failed: Element not found - ${message}`)
        .addSection(
          'Suggestion',
          'The input field may not be visible or interactable. Use the snapshot tool to see the current page state.'
        )
        .buildAsToolResult();
    }

    return response.setError(`Type failed: ${message}`).buildAsToolResult();
  }
}

/**
 * Get ARIA accessibility snapshot of the current page with element references
 */
export async function scoutSnapshot(
  session: ScoutSession,
  params: SnapshotParams
): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  try {
    const page = await session.getPage();

    // Get ARIA snapshot with element references
    const ariaSnapshot = await session.getAriaSnapshot();

    if (params.format === 'json') {
      // Return legacy JSON format if specifically requested
      const legacySnapshot = await session.getSnapshot();
      response.setResult('Page snapshot (JSON format)');
      response.addCode('await page.accessibility.snapshot();');
      response.addSection('Snapshot', `\`\`\`json\n${legacySnapshot}\n\`\`\``);
    } else {
      // Return ARIA snapshot with element references (default, AI-optimized)
      response.setResult('Page snapshot with element references');
      response.addCode("await page.locator('body').ariaSnapshot();");
      response.addSection(
        'Snapshot',
        `\`\`\`yaml\n${ariaSnapshot}\n\`\`\`\n\nElements are marked with [ref=eN]. Use these refs in click/type commands for precise targeting (when supported).`
      );
    }

    // Add page context
    const title = await page.title();
    const url = page.url();
    response.setPageState(url, title);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response
      .setError(`Snapshot failed: ${message}`)
      .addSection('Suggestion', 'The page may not be fully loaded. Try using waitFor tool first.')
      .buildAsToolResult();
  }
}

/**
 * Take a screenshot of the current page or element
 */
export async function scoutScreenshot(
  session: ScoutSession,
  params: ScreenshotParams
): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  try {
    const page = await session.getPage();
    const filename = formatScreenshotFilename(params.filename);
    let screenshot: Buffer;
    let codeSnippet: string;
    let targetDescription: string;

    if (params.testSubj) {
      const selector = subj(params.testSubj);
      const element = page.locator(selector);
      screenshot = await element.screenshot({ path: filename });
      targetDescription = `element with test subject: ${params.testSubj}`;
      codeSnippet = `await page.locator('[data-test-subj="${params.testSubj}"]').screenshot({ path: '${filename}' });`;
    } else if (params.selector) {
      const element = page.locator(params.selector);
      screenshot = await element.screenshot({ path: filename });
      targetDescription = `element with selector: ${params.selector}`;
      codeSnippet = `await page.locator('${params.selector}').screenshot({ path: '${filename}' });`;
    } else {
      screenshot = await page.screenshot({
        path: filename,
        fullPage: params.fullPage || false,
      });
      targetDescription = params.fullPage ? 'full page' : 'visible viewport';
      codeSnippet = `await page.screenshot({ path: '${filename}', fullPage: ${
        params.fullPage || false
      } });`;
    }

    const sizeKB = (screenshot.length / 1024).toFixed(2);
    response.setResult(`Screenshot of ${targetDescription} saved successfully`);
    response.addCode(codeSnippet);
    response.addSection(
      'Screenshot details',
      `- File: ${filename}\n- Size: ${sizeKB} KB\n- Dimensions: ${targetDescription}`
    );

    // Add page context
    const title = await page.title();
    const url = page.url();
    response.setPageState(url, title);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Provide helpful error guidance
    if (message.includes('not found') || message.includes('Timeout')) {
      return response
        .setError(`Screenshot failed: Element not found - ${message}`)
        .addSection(
          'Suggestion',
          'The element may not be visible. Use the snapshot tool to verify the element exists.'
        )
        .buildAsToolResult();
    }

    return response.setError(`Screenshot failed: ${message}`).buildAsToolResult();
  }
}

/**
 * Wait for an element, text, or time duration
 */
export async function scoutWaitFor(
  session: ScoutSession,
  params: WaitForParams
): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  try {
    const page = await session.getPage();
    let codeSnippet: string;
    let resultMessage: string;

    // Wait for time
    if (params.time) {
      await page.waitForTimeout(params.time * 1000);
      resultMessage = `Successfully waited for ${params.time} seconds`;
      codeSnippet = `await page.waitForTimeout(${params.time * 1000});`;
      response.setResult(resultMessage);
      response.addCode(codeSnippet);
      return response.buildAsToolResult();
    }

    // Wait for text
    if (params.text) {
      validateTextInput(params.text);
      await page.getByText(params.text).waitFor({ state: 'visible' });
      resultMessage = `Successfully waited for text: "${params.text}"`;
      codeSnippet = `await page.getByText('${params.text}').waitFor({ state: 'visible' });`;
    }
    // Wait for element by test subject
    else if (params.testSubj) {
      const selector = subj(params.testSubj);
      const state = params.state || 'visible';
      await page.locator(selector).waitFor({ state });
      resultMessage = `Successfully waited for element (${params.testSubj}) to be ${state}`;
      codeSnippet = `await page.locator('[data-test-subj="${params.testSubj}"]').waitFor({ state: '${state}' });`;
    }
    // Wait for element by selector
    else if (params.selector) {
      const state = params.state || 'visible';
      await page.locator(params.selector).waitFor({ state });
      resultMessage = `Successfully waited for element (${params.selector}) to be ${state}`;
      codeSnippet = `await page.locator('${params.selector}').waitFor({ state: '${state}' });`;
    } else {
      return response
        .setError(
          'No valid wait condition provided. Specify time, text, testSubj, or selector parameter.'
        )
        .buildAsToolResult();
    }

    response.setResult(resultMessage);
    response.addCode(codeSnippet);

    // Add page state after wait (element may now be visible)
    const title = await page.title();
    const url = page.url();
    const snapshot = await session.getAriaSnapshot();
    response.setPageState(url, title, snapshot);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Provide helpful error guidance
    if (message.includes('Timeout')) {
      return response
        .setError(`Wait failed: Timeout exceeded - ${message}`)
        .addSection(
          'Suggestion',
          'The element may never appear or take longer than expected. Try:\n- Increasing timeout in Playwright config\n- Checking if element selector is correct\n- Using snapshot tool to verify page state'
        )
        .buildAsToolResult();
    }

    return response.setError(`Wait failed: ${message}`).buildAsToolResult();
  }
}

/**
 * Get current page URL
 */
export async function scoutGetUrl(session: ScoutSession): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  try {
    const page = await session.getPage();
    const url = page.url();

    response.setResult(`Current page URL: ${url}`);
    response.addCode('const url = page.url();');
    response.addSection('URL', url);

    // Add minimal context
    const title = await page.title();
    response.setPageState(url, title);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response.setError(`Get URL failed: ${message}`).buildAsToolResult();
  }
}

/**
 * Get page title
 */
export async function scoutGetTitle(session: ScoutSession): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  try {
    const page = await session.getPage();
    const title = await page.title();
    const url = page.url();

    response.setResult(`Current page title: ${title}`);
    response.addCode('const title = await page.title();');
    response.addSection('Title', title);

    // Add minimal context
    response.setPageState(url, title);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response.setError(`Get title failed: ${message}`).buildAsToolResult();
  }
}

/**
 * Go back in browser history
 */
export async function scoutGoBack(session: ScoutSession): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  try {
    const page = await session.getPage();
    await page.goBack();

    response.setResult('Successfully navigated back in history');
    response.addCode('await page.goBack();');

    // Add updated page state
    const title = await page.title();
    const url = page.url();
    const snapshot = await session.getAriaSnapshot();
    response.setPageState(url, title, snapshot);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response
      .setError(`Go back failed: ${message}`)
      .addSection('Suggestion', 'There may be no previous page in the browser history.')
      .buildAsToolResult();
  }
}

/**
 * Go forward in browser history
 */
export async function scoutGoForward(session: ScoutSession): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  try {
    const page = await session.getPage();
    await page.goForward();

    response.setResult('Successfully navigated forward in history');
    response.addCode('await page.goForward();');

    // Add updated page state
    const title = await page.title();
    const url = page.url();
    const snapshot = await session.getAriaSnapshot();
    response.setPageState(url, title, snapshot);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response
      .setError(`Go forward failed: ${message}`)
      .addSection('Suggestion', 'There may be no forward page in the browser history.')
      .buildAsToolResult();
  }
}

/**
 * Reload the current page
 */
export async function scoutReload(session: ScoutSession): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  try {
    const page = await session.getPage();
    await page.reload();

    response.setResult('Successfully reloaded the page');
    response.addCode('await page.reload();');

    // Add updated page state
    const title = await page.title();
    const url = page.url();
    const snapshot = await session.getAriaSnapshot();
    response.setPageState(url, title, snapshot);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response.setError(`Reload failed: ${message}`).buildAsToolResult();
  }
}
