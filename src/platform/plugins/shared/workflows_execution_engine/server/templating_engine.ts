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

  public render(template: string, context: Record<string, any>): string {
    return this.engine.parseAndRenderSync(template, context);
  }
}
