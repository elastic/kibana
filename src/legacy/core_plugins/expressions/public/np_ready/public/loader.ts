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
import { share } from 'rxjs/operators';
import { Adapters, InspectorSession } from '../../../../../../plugins/inspector/public';
import { ExpressionDataHandler } from './execute';
import { ExpressionRenderHandler } from './render';
import { Data, IExpressionLoaderParams, ExpressionAST } from './types';
import { getInspector } from './services';

export class ExpressionLoader {
  data$: Observable<Data>;
  update$: ExpressionRenderHandler['update$'];
  render$: ExpressionRenderHandler['render$'];
  events$: ExpressionRenderHandler['events$'];
  loading$: Observable<void>;

  private dataHandler: ExpressionDataHandler | undefined;
  private renderHandler: ExpressionRenderHandler;
  private dataSubject: Subject<Data>;
  private loadingSubject: Subject<void>;
  private data: Data;
  private params: IExpressionLoaderParams = {};

  constructor(
    element: HTMLElement,
    expression: string | ExpressionAST,
    params: IExpressionLoaderParams
  ) {
    this.dataSubject = new Subject();
    this.data$ = this.dataSubject.asObservable().pipe(share());

    this.loadingSubject = new Subject();
    this.loading$ = this.loadingSubject.asObservable().pipe(share());

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

    this.setParams(params);

    this.loadData(expression, this.params);
  }

  destroy() {
    this.dataSubject.complete();
    this.loadingSubject.complete();
    this.renderHandler.destroy();
    if (this.dataHandler) {
      this.dataHandler.cancel();
    }
  }

  cancel() {
    if (this.dataHandler) {
      this.dataHandler.cancel();
    }
  }

  getExpression(): string | undefined {
    if (this.dataHandler) {
      return this.dataHandler.getExpression();
    }
  }

  getAst(): ExpressionAST | undefined {
    if (this.dataHandler) {
      return this.dataHandler.getAst();
    }
  }

  getElement(): HTMLElement {
    return this.renderHandler.getElement();
  }

  openInspector(title: string): InspectorSession | undefined {
    const inspector = this.inspect();
    if (inspector) {
      return getInspector().open(inspector, {
        title,
      });
    }
  }

  inspect(): Adapters | undefined {
    if (this.dataHandler) {
      return this.dataHandler.inspect();
    }
  }

  update(expression?: string | ExpressionAST, params?: IExpressionLoaderParams): void {
    this.setParams(params);

    if (expression) {
      this.loadData(expression, this.params);
    } else {
      this.render(this.data);
    }
  }

  private loadData = async (
    expression: string | ExpressionAST,
    params: IExpressionLoaderParams
  ): Promise<void> => {
    this.loadingSubject.next();
    if (this.dataHandler) {
      this.dataHandler.cancel();
    }
    this.setParams(params);
    this.dataHandler = new ExpressionDataHandler(expression, params);
    const data = await this.dataHandler.getData();
    this.dataSubject.next(data);
  };

  private render(data: Data): void {
    this.loadingSubject.next();
    this.renderHandler.render(data, this.params.extraHandlers);
  }

  private setParams(params?: IExpressionLoaderParams) {
    if (!params || !Object.keys(params).length) {
      return;
    }

    if (params.searchContext && this.params.searchContext) {
      this.params.searchContext = _.defaults(
        {},
        params.searchContext,
        this.params.searchContext
      ) as any;
    }
    if (params.extraHandlers && this.params) {
      this.params.extraHandlers = params.extraHandlers;
    }

    if (!Object.keys(this.params).length) {
      this.params = {
        ...params,
        searchContext: { type: 'kibana_context', ...(params.searchContext || {}) },
      };
    }
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
