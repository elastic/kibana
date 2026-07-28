/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRegistry } from '../types';
import type { ExpressionRenderer } from './expression_renderer';
import type { AnyExpressionRenderDefinition } from './types';
export declare class ExpressionRendererRegistry implements IRegistry<ExpressionRenderer> {
  private readonly renderers;
  register(definition: AnyExpressionRenderDefinition | (() => AnyExpressionRenderDefinition)): void;
  get(id: string): ExpressionRenderer | null;
  toJS(): Record<string, ExpressionRenderer>;
  toArray(): ExpressionRenderer[];
}
