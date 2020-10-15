/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
    return this.toArray().reduce(
      (acc, renderer) => ({
        ...acc,
        [renderer.name]: renderer,
      }),
      {} as Record<string, ExpressionRenderer>
    );
  }

  public toArray(): ExpressionRenderer[] {
    return [...this.renderers.values()];
  }
}
