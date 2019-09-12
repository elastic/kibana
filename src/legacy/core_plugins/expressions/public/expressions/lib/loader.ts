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

import { Observable, Subject } from 'rxjs';
import { first, share } from 'rxjs/operators';
import { Adapters, InspectorSession } from '../../../../../../plugins/inspector/public';
import { execute, ExpressionDataHandler } from './execute';
import { ExpressionRenderHandler } from './render';
import { RenderId, Data, IExpressionLoaderParams, ExpressionAST } from './_types';
import { getInspector } from '../services';

export class ExpressionLoader {
  data$: Observable<Data>;
  update$: Observable<any>;
  render$: Observable<RenderId>;
  events$: Observable<any>;

  private dataHandler: ExpressionDataHandler;
  private renderHandler: ExpressionRenderHandler;
  private dataSubject: Subject<Data>;
  private data: Data;

  constructor(
    element: HTMLElement,
    expression: string | ExpressionAST,
    params: IExpressionLoaderParams
  ) {
    this.dataSubject = new Subject();
    this.data$ = this.dataSubject.asObservable().pipe(share());

    this.renderHandler = new ExpressionRenderHandler(element);
    this.render$ = this.renderHandler.render$;
    this.update$ = this.renderHandler.update$;
    this.events$ = this.renderHandler.events$;

    this.update$.subscribe(({ newExpression, newParams }) => {
      this.update(newExpression, newParams);
    });

    this.data$.subscribe(data => {
      this.render(data);
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

  getAst(): ExpressionAST {
    return this.dataHandler.getAst();
  }

  getElement(): HTMLElement {
    return this.renderHandler.getElement();
  }

  openInspector(title: string): InspectorSession {
    return getInspector().open(this.inspect(), {
      title,
    });
  }

  inspect(): Adapters {
    return this.dataHandler.inspect();
  }

  update(expression: string | ExpressionAST, params: IExpressionLoaderParams): Promise<RenderId> {
    const promise = this.render$.pipe(first()).toPromise();

    if (expression !== null) {
      this.execute(expression, params);
    } else {
      this.render(this.data);
    }
    return promise;
  }

  private execute = async (
    expression: string | ExpressionAST,
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
  expression: string | ExpressionAST,
  params: IExpressionLoaderParams
) => ExpressionLoader;

export const loader: IExpressionLoader = (element, expression, params) => {
  return new ExpressionLoader(element, expression, params);
};
