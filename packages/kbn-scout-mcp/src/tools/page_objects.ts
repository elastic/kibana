/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutSession } from '../session';
import type { PageObjectParams, ToolResult } from '../types';
import { success, error, executeSafely } from '../utils';

// Import Scout page objects
// Note: These would need to be properly instantiated with a ScoutPage instance
// For now, we'll create a simplified implementation that wraps the page objects

/**
 * Use Scout page objects for high-level interactions
 */
export async function scoutPageObject(
  session: ScoutSession,
  params: PageObjectParams
): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  const { pageObject, method, args = [] } = params;

  return executeSafely(async () => {
    // Get or create the page object instance
    let pageObjectInstance = session.getPageObject(pageObject);

    if (!pageObjectInstance) {
      // Create the page object instance
      // This requires wrapping the Playwright page with ScoutPage
      const page = await session.getPage();

      // Import the specific page object class dynamically
      // In a real implementation, we'd need proper Scout page object initialization
      const { createPageObjectInstance } = await import('./page_object_factory');
      pageObjectInstance = await createPageObjectInstance(pageObject, page);

      if (!pageObjectInstance) {
        throw new Error(`Unknown page object: ${pageObject}`);
      }

      session.setPageObject(pageObject, pageObjectInstance);
    }

    // Call the method on the page object
    if (typeof pageObjectInstance[method] !== 'function') {
      throw new Error(`Method '${method}' not found on page object '${pageObject}'`);
    }

    const result = await pageObjectInstance[method](...args);

    return {
      pageObject,
      method,
      result,
      message: `Called ${pageObject}.${method}()`,
    };
  }, `Page object operation failed`);
}

/**
 * List available page objects and their methods
 */
export async function scoutListPageObjects(): Promise<ToolResult> {
  return success({
    pageObjects: {
      discover: {
        description: 'Discover app page object',
        methods: [
          'goto()',
          'selectDataView(name: string)',
          'clickNewSearch()',
          'saveSearch(name: string)',
          'waitForHistogramRendered()',
        ],
      },
      dashboard: {
        description: 'Dashboard app page object',
        methods: [
          'goto()',
          'waitForListingTableToLoad()',
          'openNewDashboard()',
          'saveDashboard(name: string)',
          'addPanelFromLibrary(...names: string[])',
          'customizePanel(options: object)',
          'removePanel(name: string)',
          'waitForPanelsToLoad(expectedCount: number)',
        ],
      },
      filterBar: {
        description: 'Filter bar page object',
        methods: [
          'addFilter(options: { field: string, operator: string, value: string })',
          'hasFilter(options: { field: string, value: string, enabled?: boolean })',
        ],
      },
      datePicker: {
        description: 'Date picker page object',
        methods: [
          'setAbsoluteRange(from: string, to: string)',
          'setCommonlyUsedTime(timeRange: string)',
          'setQuickTime(timeRange: string)',
        ],
      },
      maps: {
        description: 'Maps app page object',
        methods: ['goto()', 'waitForLayersToLoad()'],
      },
      collapsibleNav: {
        description: 'Collapsible navigation page object',
        methods: ['open()', 'close()', 'clickLink(name: string)', 'isOpen()'],
      },
      toasts: {
        description: 'Toast notifications page object',
        methods: [
          'getToasts()',
          'dismissAll()',
          'waitForToastCount(count: number)',
          'expectSuccess(message?: string)',
          'expectError(message?: string)',
        ],
      },
    },
  });
}

/**
 * Get the current state of a page object
 */
export async function scoutGetPageObjectState(
  session: ScoutSession,
  params: { pageObject: string }
): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  const pageObjectInstance = session.getPageObject(params.pageObject);

  return success({
    pageObject: params.pageObject,
    instantiated: pageObjectInstance !== null,
    cached: pageObjectInstance !== null,
  });
}
