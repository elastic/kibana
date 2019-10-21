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

  private dataHandler!: ExpressionDataHandler;
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

    this.data$.subscribe({
      next: data => {
        this.render(data);
      },
    });

    this.loadData(expression, params);
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

  update(expression: string | ExpressionAST, params: IExpressionLoaderParams): void {
    if (expression !== null) {
      this.loadData(expression, params);
    } else {
      this.render(this.data);
    }
  }

  private loadData = async (
    expression: string | ExpressionAST,
    params: IExpressionLoaderParams
  ): Promise<Data> => {
    if (this.dataHandler) {
      this.dataHandler.cancel();
    }
    this.dataHandler = new ExpressionDataHandler(expression, params);
    try {
      const data = await this.dataHandler.getData();
      if (data.type === 'error') {
        if (data.error.name !== 'AbortError') {
          this.dataSubject.error(new Error(data.error.message));
          return;
        }

        return;
      }
      this.dataSubject.next(data);
    } catch (e) {
      this.dataSubject.error(new Error('Could not fetch data'));
    }
  };

  private render(data: Data): void {
    this.renderHandler.render(data);
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
