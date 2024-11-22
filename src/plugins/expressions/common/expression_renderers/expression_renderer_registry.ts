/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IRegistry } from '../types';
import { ExpressionRenderer } from './expression_renderer';
import { AnyExpressionRenderDefinition } from './types';

export class ExpressionRendererRegistry implements IRegistry<ExpressionRenderer> {
  private readonly renderers: Map<string, ExpressionRenderer> = new Map<
    string,
    ExpressionRenderer
  >();

  register(definition: AnyExpressionRenderDefinition | (() => AnyExpressionRenderDefinition)) {
    if (typeof definition === 'function') definition = definition();
    const renderer = new ExpressionRenderer(definition);
    this.renderers.set(renderer.name, renderer);
  }

  public get(id: string): ExpressionRenderer | null {
    return this.renderers.get(id) || null;
  }

  public toJS(): Record<string, ExpressionRenderer> {
    return this.toArray().reduce((acc, renderer) => {
      acc[renderer.name] = renderer;
      return acc;
    }, {} as Record<string, ExpressionRenderer>);
  }

  public toArray(): ExpressionRenderer[] {
    return [...this.renderers.values()];
  }
}
