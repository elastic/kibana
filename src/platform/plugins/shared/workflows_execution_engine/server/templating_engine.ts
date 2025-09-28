/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import nunjucks from 'nunjucks';
import { Liquid } from 'liquidjs';


export type TemplateEngineType = 'nunjucks' | 'liquid';

export class WorkflowTemplatingEngine {
  private readonly engineType: TemplateEngineType;

  constructor(engineType: TemplateEngineType = 'liquid') {
    this.engineType = engineType;
  }

  public render(template: string, context: Record<string, any>): string {
    switch (this.engineType) {
      case 'nunjucks':
        return this.renderNunjucks(template, context);
      case 'liquid':
        return this.renderLiquid(template, context);
      default:
        throw new Error(`Unsupported template engine: ${this.engineType}`);
    }
  }

  private renderNunjucks(template: string, context: Record<string, any>): string {
    const env = nunjucks.configure({
      autoescape: true,
    });

    // We can add custom functions to the Nunjucks environment here.
    // In theory, this could be same as `keep.` functions
    env.addGlobal('now', function (format: string = 'iso') {
      const date = new Date();
      if (format === 'iso') return date.toISOString();
      if (format === 'locale') return date.toLocaleString();
      return date;
    });

    env.addFilter('json', function (value, spaces) {
      if (value instanceof nunjucks.runtime.SafeString) {
        value = value.toString();
      }
      const jsonString = JSON.stringify(value, null, spaces)?.replace(/</g, '\\u003c');
      return new nunjucks.runtime.SafeString(jsonString);
    });

    return env.renderString(template, context);
  }

  private renderLiquid(template: string, context: Record<string, any>): string {
    const engine = new Liquid({
      strictFilters: true,
      strictVariables: false,
    });

    return engine.parseAndRenderSync(template, context);
  }

}
