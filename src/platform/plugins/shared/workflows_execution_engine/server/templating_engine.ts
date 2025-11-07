/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from 'expr-eval';
import jexl from 'jexl';
import { Liquid } from 'liquidjs';

export class WorkflowTemplatingEngine {
  private readonly engine: Liquid;
  private parser: Parser | undefined;
  private jexl = false;

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
    if (template.startsWith('$expr{{') && template.endsWith('}}')) {
      return this.evaluateExprEvalExpression(template, context);
    } else if (template.startsWith('$jexl{{') && template.endsWith('}}')) {
      return this.evaluateJexlExpression(template, context);
    } else if (template.startsWith('${{') && template.endsWith('}}')) {
      return this.evaluateLiquidJsExpression(template, context);
    } else {
      throw new Error(`The provided expression is invalid. Got: ${template}.`);
    }
  }

  private evaluateExprEvalExpression(template: string, context: Record<string, unknown>): unknown {
    if (!this.parser) {
      this.parser = new Parser({
        operators: {
          // disable member access to prevent prototype pollution
          add: true,
          comparison: true,
          concatenate: true,
          conditional: true,
          divide: true,
          factorial: true,
          logical: true,
          multiply: true,
          power: true,
          remainder: true,
          subtract: true,
          sin: true,
          cos: true,
          tan: true,
          asin: true,
          acos: true,
          atan: true,
          sinh: true,
          cosh: true,
          tanh: true,
          asinh: true,
          acosh: true,
          atanh: true,
          sqrt: true,
          log: true,
          ln: true,
          lg: true,
          log10: true,
          abs: true,
          ceil: true,
          floor: true,
          round: true,
          trunc: true,
          exp: true,
          length: true,
          in: true,
          random: true,
          min: true,
          max: true,
          assignment: false,
          fndef: false,
          cbrt: true,
          expm1: true,
          log1p: true,
          sign: true,
          log2: true,
        },
      });
      this.parser.functions.capitalize = (str: string) => {
        if (typeof str !== 'string' || str.length === 0) {
          return str;
        }
        return str.charAt(0).toUpperCase() + str.slice(1);
      };
      this.parser.functions.slice = (arrayOrString: unknown[], start: number, end: number) => {
        if (!Array.isArray(arrayOrString) && typeof arrayOrString !== 'string') {
          return arrayOrString;
        }
        return arrayOrString.slice(start, end);
      };
    }

    let resolvedExpression = template.trim();
    const exprStart = '$expr{{';
    const openExpressionIndex = resolvedExpression.indexOf(exprStart);
    const closeExpressionIndex = resolvedExpression.lastIndexOf('}}');

    if (openExpressionIndex === -1 || closeExpressionIndex === -1) {
      throw new Error(`The provided expression is invalid. Got: ${template}.`);
    }

    resolvedExpression = resolvedExpression
      .substring(openExpressionIndex + exprStart.length, closeExpressionIndex)
      .trim();

    try {
      const parsed = this.parser.parse(resolvedExpression);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return parsed.evaluate(context as any);
    } catch (err) {
      throw new Error(`The provided expression is invalid. Got: ${template}.`);
    }
  }

  private evaluateJexlExpression(template: string, context: Record<string, unknown>): unknown {
    if (!this.jexl) {
      jexl.addTransform('capitalize', (str: string) => {
        if (typeof str !== 'string' || str.length === 0) {
          return str;
        }
        return str.charAt(0).toUpperCase() + str.slice(1);
      });
      jexl.addTransform('slice', (arrayOrString: unknown[], start: number, end: number) => {
        if (!Array.isArray(arrayOrString) && typeof arrayOrString !== 'string') {
          return arrayOrString;
        }
        return arrayOrString.slice(start, end);
      });
      this.jexl = true;
    }

    let resolvedExpression = template.trim();
    const exprStart = '$jexl{{';
    const openExpressionIndex = resolvedExpression.indexOf(exprStart);
    const closeExpressionIndex = resolvedExpression.lastIndexOf('}}');

    if (openExpressionIndex === -1 || closeExpressionIndex === -1) {
      throw new Error(`The provided expression is invalid. Got: ${template}.`);
    }

    resolvedExpression = resolvedExpression
      .substring(openExpressionIndex + exprStart.length, closeExpressionIndex)
      .trim();

    try {
      return jexl.evalSync(resolvedExpression, context);
    } catch (err) {
      throw new Error(`The provided expression is invalid. Got: ${template}.`);
    }
  }

  private evaluateLiquidJsExpression(template: string, context: Record<string, unknown>): unknown {
    let resolvedExpression = template.trim();
    const exprStart = '${{';
    const openExpressionIndex = resolvedExpression.indexOf(exprStart);
    const closeExpressionIndex = resolvedExpression.lastIndexOf('}}');

    if (openExpressionIndex === -1 || closeExpressionIndex === -1) {
      throw new Error(`The provided expression is invalid. Got: ${template}.`);
    }

    resolvedExpression = resolvedExpression
      .substring(openExpressionIndex + exprStart.length, closeExpressionIndex)
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

    if (
      typeof value === 'string' &&
      ['${{', '$jexl{{', '$expr{{'].some((prefix) => value.startsWith(prefix))
    ) {
      // remove the first $ only as the evaluateExpression removes the {{ and }} later
      return this.evaluateExpression(value, context);
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
