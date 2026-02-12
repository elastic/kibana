/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FS } from 'liquidjs';
import { Liquid } from 'liquidjs';
import { removeDisallowedLiquidTags } from '@kbn/workflows';

/**
 * A no-op filesystem implementation for the LiquidJS engine.
 * Workflow templates do not support file operations.
 */
const noopFs: FS = {
  exists: async () => false,
  existsSync: () => false,
  readFile: async (filepath: string) => {
    throw new Error(
      `File reading is not supported in workflow templates. Attempted to read: ${filepath}`
    );
  },
  readFileSync: (filepath: string) => {
    throw new Error(
      `File reading is not supported in workflow templates. Attempted to read: ${filepath}`
    );
  },
  resolve: (_dir: string, file: string, _ext: string) => file,
  contains: () => false,
};

export class WorkflowTemplatingEngine {
  private readonly engine: Liquid;

  constructor() {
    this.engine = new Liquid({
      strictFilters: true,
      strictVariables: false,
      ownPropertyOnly: true,
      fs: noopFs,
      templates: {}
    });

    // Remove unsupported tags so LiquidJS treats them as unknown (parse error).
    removeDisallowedLiquidTags(this.engine);

    // register json_parse filter that converts JSON string to object
    this.engine.registerFilter('json_parse', (value: unknown): unknown => {
      if (typeof value !== 'string') {
        return value;
      }
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    });
  }

  public render<T>(obj: T, context: Record<string, unknown>): T {
    return this.renderValueRecursively(obj, context) as T;
  }

  public evaluateExpression(template: string, context: Record<string, unknown>): unknown {
    this.validateTemplate(template);

    let resolvedExpression = template.trim();
    const openExpressionIndex = resolvedExpression.indexOf('{{');
    const closeExpressionIndex = resolvedExpression.lastIndexOf('}}');

    if (openExpressionIndex === -1 || closeExpressionIndex === -1) {
      throw new Error(`The provided expression is invalid. Got: ${template}.`);
    }

    resolvedExpression = resolvedExpression
      .substring(openExpressionIndex + 2, closeExpressionIndex)
      .trim();

    try {
      return this.engine.evalValueSync(resolvedExpression, context);
    } catch (err) {
      throw new Error(`The provided expression is invalid. Got: ${template}.`);
    }
  }

  private renderValueRecursively(value: unknown, context: Record<string, unknown>): unknown {
    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string' && value.startsWith('${{') && value.endsWith('}}')) {
      // remove the first $ only as the evaluateExpression removes the {{ and }} later
      return this.evaluateExpression(value.substring(1), context);
    }

    // Handle string values - render them using the template engine
    if (typeof value === 'string') {
      return this.renderString(value, context);
    }

    // Handle arrays - recursively render each element
    if (Array.isArray(value)) {
      return value.map((item) => this.renderValueRecursively(item, context));
    }

    // Handle objects - recursively render each property
    if (typeof value === 'object') {
      const renderedObject: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        renderedObject[key] = this.renderValueRecursively(val, context);
      }
      return renderedObject;
    }

    // Return primitive values as-is (numbers, booleans, etc.)
    return value;
  }

  /**
   * Liquid tags that are not supported in workflow templates.
   */
  private static readonly UNSUPPORTED_TAG_PATTERN = /\{%-?\s*(include|render|layout)\s/i;

  /**
   * Validates that a template string does not use unsupported Liquid tags.
   */
  private validateTemplate(template: string): void {
    if (WorkflowTemplatingEngine.UNSUPPORTED_TAG_PATTERN.test(template)) {
      throw new Error('Template contains unsupported tags.');
    }
  }

  private renderString(template: string, context: Record<string, unknown>): string {
    try {
      this.validateTemplate(template);
      return this.engine.parseAndRenderSync(template, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // customer-facing error message without the default line number and column number
      const customerFacingErrorMessage = errorMessage.replace(/, line:\d+, col:\d+/g, '');
      throw new Error(customerFacingErrorMessage);
    }
  }
}
