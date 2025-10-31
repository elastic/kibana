/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Liquid } from 'liquidjs';

export class WorkflowTemplatingEngine {
  private readonly engine: Liquid;

  constructor() {
    this.engine = new Liquid({
      strictFilters: true,
      strictVariables: false,
    });

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
    let resolvedExpression = template.trim();
    const openExpressionIndex = resolvedExpression.indexOf('{{');
    const closeExpressionIndex = resolvedExpression.lastIndexOf('}}');

    if (!openExpressionIndex && !closeExpressionIndex) {
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

  private renderString(template: string, context: Record<string, unknown>): string {
    try {
      return this.engine.parseAndRenderSync(template, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // customer-facing error message without the default line number and column number
      const customerFacingErrorMessage = errorMessage.replace(/, line:\d+, col:\d+/g, '');
      throw new Error(customerFacingErrorMessage);
    }
  }
}
