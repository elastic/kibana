/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Context, toValueSync } from 'liquidjs';
import { createWorkflowLiquidEngine, SizeLimitedEmitter } from '@kbn/workflows';
import { TemplateSizeLimitExceeded } from './step/errors';

export class WorkflowTemplatingEngine {
  /**
   * Liquid tags that are not supported in workflow templates.
   */
  private static readonly UNSUPPORTED_TAG_PATTERN = /\{%-?\s*(include|render|layout)\s/i;

  private readonly engine;

  constructor() {
    this.engine = createWorkflowLiquidEngine({
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

  public render<T>(obj: T, context: Record<string, unknown>, maxOutputBytes?: number): T {
    return this.renderValueRecursively(obj, context, maxOutputBytes) as T;
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

  private renderValueRecursively(
    value: unknown,
    context: Record<string, unknown>,
    maxOutputBytes?: number
  ): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string' && value.startsWith('${{') && value.endsWith('}}')) {
      return this.evaluateExpression(value.substring(1), context);
    }

    if (typeof value === 'string') {
      return this.renderString(value, context, maxOutputBytes);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.renderValueRecursively(item, context, maxOutputBytes));
    }

    if (typeof value === 'object') {
      const renderedObject: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        renderedObject[key] = this.renderValueRecursively(val, context, maxOutputBytes);
      }
      return renderedObject;
    }

    return value;
  }

  /**
   * Validates that a template string does not use unsupported Liquid tags.
   */
  private validateTemplate(template: string): void {
    if (WorkflowTemplatingEngine.UNSUPPORTED_TAG_PATTERN.test(template)) {
      throw new Error('Template contains unsupported tags.');
    }
  }

  private renderString(
    template: string,
    context: Record<string, unknown>,
    maxOutputBytes?: number
  ): string {
    try {
      this.validateTemplate(template);

      if (maxOutputBytes && maxOutputBytes > 0) {
        const tpl = this.engine.parse(template);
        const ctx = new Context(context, this.engine.options, { sync: true });
        const emitter = new SizeLimitedEmitter(
          maxOutputBytes,
          (limit) => new TemplateSizeLimitExceeded(limit)
        );
        toValueSync(this.engine.renderer.renderTemplates(tpl, ctx, emitter));
        return emitter.buffer;
      }

      return this.engine.parseAndRenderSync(template, context);
    } catch (error) {
      // Walk the error cause chain — LiquidJS may wrap our error in originalError or cause
      let cause: unknown = error;
      while (cause != null) {
        if (cause instanceof TemplateSizeLimitExceeded) {
          throw cause;
        }
        const errObj = cause as { originalError?: unknown; cause?: unknown };
        const next = errObj.originalError ?? errObj.cause;
        if (next === cause || next == null) break;
        cause = next;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      const customerFacingErrorMessage = errorMessage.replace(/, line:\d+, col:\d+/g, '');
      throw new Error(customerFacingErrorMessage);
    }
  }
}
