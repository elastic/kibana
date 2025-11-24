/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  TEST_PATTERNS,
  FIXTURE_PATTERNS,
  PAGE_OBJECT_PATTERNS,
  CYPRESS_TO_SCOUT_MAPPINGS,
  COMMON_PITFALLS,
  WAIT_STRATEGIES,
  TEST_TYPE_GUIDE,
} from './knowledge';
import { CONVERSION_PATTERNS } from './knowledge/conversion_patterns';

/**
 * Resource Manager for Scout MCP
 *
 * Exposes Scout knowledge base as MCP resources that AI can reference
 */
export class ResourceManager {
  private resources: Map<string, { content: string; mimeType: string; description: string }>;

  constructor() {
    this.resources = new Map();
    this.initializeResources();
  }

  /**
   * Initialize all knowledge base resources
   */
  private initializeResources(): void {
    // Test writing patterns
    this.resources.set('scout://patterns/test-writing', {
      content: TEST_PATTERNS,
      mimeType: 'text/markdown',
      description: 'Scout test patterns and best practices from real-world tests',
    });

    this.resources.set('scout://patterns/fixtures', {
      content: FIXTURE_PATTERNS,
      mimeType: 'text/markdown',
      description: 'Scout fixture usage patterns (worker vs test scope)',
    });

    // Page object patterns
    this.resources.set('scout://patterns/page-objects', {
      content: PAGE_OBJECT_PATTERNS,
      mimeType: 'text/markdown',
      description: 'Multi-class page object architecture patterns',
    });

    // Wait strategies
    this.resources.set('scout://patterns/wait-strategies', {
      content: WAIT_STRATEGIES,
      mimeType: 'text/markdown',
      description: 'Wait strategies and TIMEOUTS patterns',
    });

    // Test type selection guide
    this.resources.set('scout://patterns/test-type-selection', {
      content: TEST_TYPE_GUIDE,
      mimeType: 'text/markdown',
      description: 'Guide for choosing between unit, integration, and E2E tests',
    });

    // Migration patterns
    this.resources.set('scout://migration/cypress-patterns', {
      content: CYPRESS_TO_SCOUT_MAPPINGS,
      mimeType: 'text/markdown',
      description: 'Cypress to Scout pattern mappings',
    });

    this.resources.set('scout://migration/common-pitfalls', {
      content: COMMON_PITFALLS,
      mimeType: 'text/markdown',
      description: 'Common migration pitfalls and how to avoid them',
    });

    // Conversion patterns (for non-Scout tests)
    this.resources.set('scout://migration/conversion-patterns', {
      content: CONVERSION_PATTERNS,
      mimeType: 'text/markdown',
      description: 'Patterns for converting Cypress tests to unit/integration tests',
    });
  }

  /**
   * List all available resources
   */
  listResources() {
    return Array.from(this.resources.entries()).map(([uri, resource]) => ({
      uri,
      name: uri.split('://')[1],
      description: resource.description,
      mimeType: resource.mimeType,
    }));
  }

  /**
   * Read a specific resource
   */
  readResource(uri: string) {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }
    return {
      contents: [
        {
          uri,
          mimeType: resource.mimeType,
          text: resource.content,
        },
      ],
    };
  }

  /**
   * Check if a resource exists
   */
  hasResource(uri: string): boolean {
    return this.resources.has(uri);
  }

  /**
   * Get resource content directly
   */
  getResourceContent(uri: string): string | undefined {
    return this.resources.get(uri)?.content;
  }
}
