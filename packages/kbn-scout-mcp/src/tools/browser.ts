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
import { error, executeSafely, formatScreenshotFilename } from '../utils';

/**
 * Navigate to a URL or Kibana app
 */
export async function scoutNavigate(
  session: ScoutSession,
  params: NavigateParams
): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const page = await session.getPage();

    if (params.url) {
      await page.goto(params.url);
      return `Navigated to ${params.url}`;
    }

    if (params.app) {
      const baseUrl = page.context().options.baseURL || '';
      const path = params.path || '';
      const url = `${baseUrl}/app/${params.app}${path}`;
      await page.goto(url);
      return `Navigated to Kibana app: ${params.app}${path}`;
    }

    throw new Error('Either url or app parameter must be provided');
  }, 'Navigation failed');
}

/**
 * Click an element by test subject or selector
 */
export async function scoutClick(session: ScoutSession, params: ClickParams): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  if (!params.testSubj && !params.selector) {
    return error('Either testSubj or selector parameter must be provided');
  }

  return executeSafely(async () => {
    const page = await session.getPage();

    if (params.testSubj) {
      const selector = subj(params.testSubj);
      await page.locator(selector).click();
      return `Clicked element with test subject: ${params.testSubj}`;
    }

    if (params.selector) {
      await page.locator(params.selector).click();
      return `Clicked element with selector: ${params.selector}`;
    }
  }, 'Click failed');
}

/**
 * Type text into an element
 */
export async function scoutType(session: ScoutSession, params: TypeParams): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  if (!params.testSubj && !params.selector) {
    return error('Either testSubj or selector parameter must be provided');
  }

  if (!params.text) {
    return error('text parameter is required');
  }

  return executeSafely(async () => {
    const page = await session.getPage();
    let locator;

    if (params.testSubj) {
      const selector = subj(params.testSubj);
      locator = page.locator(selector);
    } else if (params.selector) {
      locator = page.locator(params.selector);
    }

    if (!locator) {
      throw new Error('Locator not found');
    }

    // Clear existing content first
    await locator.clear();

    // Type the text
    if (params.slowly) {
      await locator.pressSequentially(params.text, { delay: 100 });
    } else {
      await locator.fill(params.text);
    }

    // Submit if requested
    if (params.submit) {
      await locator.press('Enter');
    }

    const target = params.testSubj || params.selector;
    return `Typed text into ${target}${params.submit ? ' and submitted' : ''}`;
  }, 'Type failed');
}

/**
 * Get accessibility snapshot of the current page
 */
export async function scoutSnapshot(
  session: ScoutSession,
  params: SnapshotParams
): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const page = await session.getPage();
    const snapshot = await page.accessibility.snapshot();

    if (params.format === 'json') {
      return snapshot;
    }

    // Convert to readable text format
    function formatNode(node: any, indent: string = ''): string {
      let result = `${indent}- ${node.role}`;
      if (node.name) {
        result += ` "${node.name}"`;
      }
      if (node.value) {
        result += `: ${node.value}`;
      }
      result += '\n';

      if (node.children) {
        for (const child of node.children) {
          result += formatNode(child, indent + '  ');
        }
      }

      return result;
    }

    return snapshot ? formatNode(snapshot) : 'No snapshot available';
  }, 'Snapshot failed');
}

/**
 * Take a screenshot of the current page or element
 */
export async function scoutScreenshot(
  session: ScoutSession,
  params: ScreenshotParams
): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const page = await session.getPage();
    const filename = formatScreenshotFilename(params.filename);

    let screenshot: Buffer;

    if (params.testSubj) {
      const selector = subj(params.testSubj);
      const element = page.locator(selector);
      screenshot = await element.screenshot({ path: filename });
    } else if (params.selector) {
      const element = page.locator(params.selector);
      screenshot = await element.screenshot({ path: filename });
    } else {
      screenshot = await page.screenshot({
        path: filename,
        fullPage: params.fullPage || false,
      });
    }

    return {
      filename,
      size: screenshot.length,
      message: `Screenshot saved to ${filename}`,
    };
  }, 'Screenshot failed');
}

/**
 * Wait for an element or condition
 */
export async function scoutWaitFor(
  session: ScoutSession,
  params: WaitForParams
): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const page = await session.getPage();

    // Wait for time
    if (params.time) {
      await page.waitForTimeout(params.time * 1000);
      return `Waited for ${params.time} seconds`;
    }

    // Wait for text
    if (params.text) {
      await page.getByText(params.text).waitFor({ state: 'visible' });
      return `Waited for text: ${params.text}`;
    }

    // Wait for element by test subject
    if (params.testSubj) {
      const selector = subj(params.testSubj);
      const state = params.state || 'visible';
      await page.locator(selector).waitFor({ state });
      return `Waited for test subject ${params.testSubj} to be ${state}`;
    }

    // Wait for element by selector
    if (params.selector) {
      const state = params.state || 'visible';
      await page.locator(params.selector).waitFor({ state });
      return `Waited for selector ${params.selector} to be ${state}`;
    }

    throw new Error('No valid wait condition provided');
  }, 'Wait failed');
}

/**
 * Get current page URL
 */
export async function scoutGetUrl(session: ScoutSession): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const page = await session.getPage();
    return page.url();
  }, 'Get URL failed');
}

/**
 * Get page title
 */
export async function scoutGetTitle(session: ScoutSession): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const page = await session.getPage();
    return page.title();
  }, 'Get title failed');
}

/**
 * Go back in browser history
 */
export async function scoutGoBack(session: ScoutSession): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const page = await session.getPage();
    await page.goBack();
    return 'Navigated back';
  }, 'Go back failed');
}

/**
 * Go forward in browser history
 */
export async function scoutGoForward(session: ScoutSession): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const page = await session.getPage();
    await page.goForward();
    return 'Navigated forward';
  }, 'Go forward failed');
}

/**
 * Reload the current page
 */
export async function scoutReload(session: ScoutSession): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const page = await session.getPage();
    await page.reload();
    return 'Page reloaded';
  }, 'Reload failed');
}
