/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
    const scoutPage = await session.getPage();
    const baseUrl = session.getTargetUrl();
    let codeSnippet: string;

    if (params.url) {
      // Validate URL to prevent SSRF
      const sanitizedUrl = validateAndSanitizeUrl(params.url, baseUrl);
      await scoutPage.goto(sanitizedUrl);
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

      // Use Scout's gotoApp method
      // Note: PathOptions doesn't support direct path, so if path is provided, use goto
      // Otherwise use gotoApp for cleaner code
      if (safePath) {
        const appUrl = `${baseUrl}/app/${params.app}${safePath}`;
        await scoutPage.goto(appUrl);
        codeSnippet = `await page.goto('${appUrl}');`;
      } else {
        await scoutPage.gotoApp(params.app);
        codeSnippet = `await page.gotoApp('${params.app}');`;
      }
      response.setResult(`Successfully navigated to Kibana app: ${params.app}${safePath}`);
      response.setKibanaState(params.app, safePath);
    } else {
      return response.setError('Either url or app parameter must be provided').buildAsToolResult();
    }

    // Add executed code for transparency
    response.addCode(codeSnippet);

    // Add current page state with ARIA snapshot
    const title = await scoutPage.title();
    const url = scoutPage.url();
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
    const scoutPage = await session.getPage();
    let targetDescription: string;
    let codeSnippet: string;

    if (params.testSubj) {
      // Use Scout's testSubj.click() method
      await scoutPage.testSubj.click(params.testSubj);
      targetDescription = params.element || `element with test subject: ${params.testSubj}`;
      codeSnippet = `await page.testSubj.click('${params.testSubj}');`;
      response.setResult(`Successfully clicked ${targetDescription}`);
    } else if (params.selector) {
      await scoutPage.locator(params.selector).click();
      targetDescription = params.element || `element with selector: ${params.selector}`;
      codeSnippet = `await page.locator('${params.selector}').click();`;
      response.setResult(`Successfully clicked ${targetDescription}`);
    }

    // Add executed code
    response.addCode(codeSnippet!);

    // Add updated page state
    const title = await scoutPage.title();
    const url = scoutPage.url();
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
    const scoutPage = await session.getPage();
    let targetDescription: string = '';
    let codeSnippet: string = '';

    if (params.testSubj) {
      targetDescription = params.element || `element with test subject: ${params.testSubj}`;

      // Use Scout's testSubj methods
      if (params.slowly) {
        await scoutPage.testSubj.typeWithDelay(params.testSubj, params.text, { delay: 100 });
        codeSnippet = `await page.testSubj.typeWithDelay('${params.testSubj}', '${params.text}', { delay: 100 });`;
      } else {
        await scoutPage.testSubj.fill(params.testSubj, params.text);
        codeSnippet = `await page.testSubj.fill('${params.testSubj}', '${params.text}');`;
      }

      // Submit if requested
      if (params.submit) {
        await scoutPage.testSubj.locator(params.testSubj).press('Enter');
        codeSnippet += `\nawait page.testSubj.locator('${params.testSubj}').press('Enter');`;
      }
    } else if (params.selector) {
      const locator = scoutPage.locator(params.selector);
      targetDescription = params.element || `element with selector: ${params.selector}`;

      // Clear existing content first
      await locator.clear();

      // Type the text
      if (params.slowly) {
        await locator.pressSequentially(params.text, { delay: 100 });
        codeSnippet = `await page.locator('${params.selector}').pressSequentially('${params.text}', { delay: 100 });`;
      } else {
        await locator.fill(params.text);
        codeSnippet = `await page.locator('${params.selector}').fill('${params.text}');`;
      }

      // Submit if requested
      if (params.submit) {
        await locator.press('Enter');
        codeSnippet += `\nawait page.keyboard.press('Enter');`;
      }
    } else {
      throw new Error('Either testSubj or selector parameter must be provided');
    }

    response.setResult(
      `Successfully typed text into ${targetDescription}${params.submit ? ' and submitted' : ''}`
    );
    response.addCode(codeSnippet);

    // Add updated page state
    const title = await scoutPage.title();
    const url = scoutPage.url();
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
    const scoutPage = await session.getPage();

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
    const title = await scoutPage.title();
    const url = scoutPage.url();
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
    const scoutPage = await session.getPage();
    const filename = formatScreenshotFilename(params.filename);
    let screenshot: Buffer;
    let codeSnippet: string;
    let targetDescription: string;

    if (params.testSubj) {
      // Use Scout's testSubj.locator() method
      const element = scoutPage.testSubj.locator(params.testSubj);
      screenshot = await element.screenshot({ path: filename });
      targetDescription = `element with test subject: ${params.testSubj}`;
      codeSnippet = `await page.testSubj.locator('${params.testSubj}').screenshot({ path: '${filename}' });`;
    } else if (params.selector) {
      const element = scoutPage.locator(params.selector);
      screenshot = await element.screenshot({ path: filename });
      targetDescription = `element with selector: ${params.selector}`;
      codeSnippet = `await page.locator('${params.selector}').screenshot({ path: '${filename}' });`;
    } else {
      screenshot = await scoutPage.screenshot({
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
    const title = await scoutPage.title();
    const url = scoutPage.url();
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
    const scoutPage = await session.getPage();
    let codeSnippet: string;
    let resultMessage: string;

    // Wait for time
    if (params.time) {
      await scoutPage.waitForTimeout(params.time * 1000);
      resultMessage = `Successfully waited for ${params.time} seconds`;
      codeSnippet = `await page.waitForTimeout(${params.time * 1000});`;
      response.setResult(resultMessage);
      response.addCode(codeSnippet);
      return response.buildAsToolResult();
    }

    // Wait for text
    if (params.text) {
      validateTextInput(params.text);
      await scoutPage.getByText(params.text).waitFor({ state: 'visible' });
      resultMessage = `Successfully waited for text: "${params.text}"`;
      codeSnippet = `await page.getByText('${params.text}').waitFor({ state: 'visible' });`;
    }
    // Wait for element by test subject - use Scout's testSubj.waitForSelector
    else if (params.testSubj) {
      const state = params.state || 'visible';
      await scoutPage.testSubj.waitForSelector(params.testSubj, { state });
      resultMessage = `Successfully waited for element (${params.testSubj}) to be ${state}`;
      codeSnippet = `await page.testSubj.waitForSelector('${params.testSubj}', { state: '${state}' });`;
    }
    // Wait for element by selector
    else if (params.selector) {
      const state = params.state || 'visible';
      await scoutPage.locator(params.selector).waitFor({ state });
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
    const title = await scoutPage.title();
    const url = scoutPage.url();
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
          'The element may never appear or take longer than expected. Try:\n- Checking if element selector is correct\n- Using snapshot tool to verify page state\n- Waiting longer or checking if the page is still loading'
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
    const scoutPage = await session.getPage();
    const url = scoutPage.url();

    response.setResult(`Current page URL: ${url}`);
    response.addCode('const url = page.url();');
    response.addSection('URL', url);

    // Add minimal context
    const title = await scoutPage.title();
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
    const scoutPage = await session.getPage();
    const title = await scoutPage.title();
    const url = scoutPage.url();

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
 * Reload the current page
 */
export async function scoutReload(session: ScoutSession): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  try {
    const scoutPage = await session.getPage();
    await scoutPage.reload();

    response.setResult('Successfully reloaded the page');
    response.addCode('await page.reload();');

    // Add updated page state
    const title = await scoutPage.title();
    const url = scoutPage.url();
    const snapshot = await session.getAriaSnapshot();
    response.setPageState(url, title, snapshot);

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response.setError(`Reload failed: ${message}`).buildAsToolResult();
  }
}
