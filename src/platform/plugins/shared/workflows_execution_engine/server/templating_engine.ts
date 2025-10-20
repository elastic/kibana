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

    // register json filter that converts JSON string to object
    this.engine.registerFilter('json', (value: unknown): unknown => {
      if (typeof value !== 'string') {
        return value;
      }
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    });
    // register dump filter that converts an object to a JSON string
    this.engine.registerFilter('dump', (value: unknown): string => {
      if (typeof value !== 'object' || value === null) {
        return String(value);
      }
      try {
        return JSON.stringify(value, null, 2);
      } catch (error) {
        return String(value);
      }
    });
  }

  public render<T>(obj: T, context: Record<string, any>): T {
    return this.renderValueRecursively(obj, context) as T;
  }

  private renderValueRecursively(value: unknown, context: Record<string, any>): unknown {
    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle string values - render them using the template engine
    if (typeof value === 'string') {
      return this.engine.parseAndRenderSync(value, context);
    }

    // Handle arrays - recursively render each element
    if (Array.isArray(value)) {
      return value.map((item) => this.renderValueRecursively(item, context));
    }

    // Handle objects - recursively render each property
    if (typeof value === 'object') {
      const renderedObject: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        renderedObject[key] = this.renderValueRecursively(val, context);
      }
      return renderedObject;
    }

    // Return primitive values as-is (numbers, booleans, etc.)
    return value;
  }
}
