/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import nunjucks from 'nunjucks';
import Mustache from 'mustache';

export class WorkflowTemplatingEngine {
  private syntax: 'mustache' | 'nunjucks';

  constructor(syntax: 'mustache' | 'nunjucks' = 'nunjucks') {
    this.syntax = syntax;
  }

  public render(template: string, context: Record<string, any>): string {
    switch (this.syntax) {
      case 'nunjucks':
        return this.renderNunjucks(template, context);
      case 'mustache':
        return this.renderMustache(template, context);
      default:
        throw new Error(`Unsupported syntax: ${this.syntax}`);
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

    return env.renderString(template, context);
  }

  private renderMustache(template: string, context: Record<string, any>): string {
    // Assuming Mustache is available globally or imported
    return Mustache.render(template, context);
  }
}
