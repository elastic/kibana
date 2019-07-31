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

import { Inspector, InspectorSession } from 'ui/inspector/inspector';
import { Ast } from '@kbn/interpreter/target/common';
import { Observable } from 'rxjs';
import * as Rx from 'rxjs';
import { share } from 'rxjs/operators';
import { Adapters } from 'ui/inspector';
import { execute, ExpressionDataHandler } from './execute';
import { ExpressionRenderHandler } from './render';
import { RenderId, Data, IExpressionLoaderParams } from './_types';

export class ExpressionLoader {
  data$: Observable<Data>;
  update$: Observable<any>;
  render$: Observable<RenderId>;
  events$: Observable<any>;

  private dataHandler: ExpressionDataHandler;
  private renderHandler: ExpressionRenderHandler;
  private dataSubject: Rx.Subject<Data>;
  private data: Data;

  constructor(element: HTMLElement, expression: string | Ast, params: IExpressionLoaderParams) {
    this.dataSubject = new Rx.Subject();
    this.data$ = this.dataSubject.asObservable().pipe(share());

    this.renderHandler = new ExpressionRenderHandler(element);
    this.render$ = this.renderHandler.render$;
    this.update$ = this.renderHandler.update$;
    this.events$ = this.renderHandler.events$;

    this.update$.subscribe(({ newExpression, newParams }) => {
      this.update(newExpression, newParams);
    });

    this.execute(expression, params);
    // @ts-ignore
    this.dataHandler = this.dataHandler;
  }

  destroy() {}

  cancel() {
    this.dataHandler.cancel();
  }

  getExpression(): string {
    return this.dataHandler.getExpression();
  }

  getAst(): Ast {
    return this.dataHandler.getAst();
  }

  getElement(): HTMLElement {
    return this.renderHandler.getElement();
  }

  openInspector(title: string): InspectorSession {
    return Inspector.open(this.inspect(), {
      title,
    });
  }

  inspect(): Adapters {
    return this.dataHandler.inspect();
  }

  async update(expression: string | Ast, params: IExpressionLoaderParams): Promise<RenderId> {
    if (expression !== null) {
      this.data = await this.execute(expression, params);
    }
    const renderId = this.render(this.data);
    return renderId;
  }

  private execute = async (
    expression: string | Ast,
    params: IExpressionLoaderParams
  ): Promise<Data> => {
    if (this.dataHandler) {
      this.dataHandler.cancel();
    }
    this.dataHandler = execute(expression, params);
    const data = await this.dataHandler.getData();
    this.dataSubject.next(data);
    return data;
  };

  private async render(data: Data): Promise<RenderId> {
    return this.renderHandler.render(data);
  }
}

export type IExpressionLoader = (
  element: HTMLElement,
  expression: string | Ast,
  params: IExpressionLoaderParams
) => ExpressionLoader;

export const loader: IExpressionLoader = (element, expression, params) => {
  return new ExpressionLoader(element, expression, params);
};
