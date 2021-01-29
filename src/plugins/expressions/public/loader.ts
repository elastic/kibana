/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { defaults } from 'lodash';
import { Adapters } from '../../inspector/public';
import { IExpressionLoaderParams } from './types';
import { ExpressionAstExpression } from '../common';
import { ExecutionContract } from '../common/execution/execution_contract';

import { ExpressionRenderHandler } from './render';
import { getExpressionsService } from './services';

type Data = any;

export class ExpressionLoader {
  data$: Observable<Data>;
  update$: ExpressionRenderHandler['update$'];
  render$: ExpressionRenderHandler['render$'];
  events$: ExpressionRenderHandler['events$'];
  loading$: Observable<void>;

  private execution: ExecutionContract | undefined;
  private renderHandler: ExpressionRenderHandler;
  private dataSubject: Subject<Data>;
  private loadingSubject: Subject<boolean>;
  private data: Data;
  private params: IExpressionLoaderParams = {};

  constructor(
    element: HTMLElement,
    expression?: string | ExpressionAstExpression,
    params?: IExpressionLoaderParams
  ) {
    this.dataSubject = new Subject();
    this.data$ = this.dataSubject.asObservable();

    this.loadingSubject = new BehaviorSubject<boolean>(false);
    // loading is a "hot" observable,
    // as loading$ could emit straight away in the constructor
    // and we want to notify subscribers about it, but all subscriptions will happen later
    this.loading$ = this.loadingSubject.asObservable().pipe(
      filter((_) => _ === true),
      map(() => void 0)
    );

    this.renderHandler = new ExpressionRenderHandler(element, {
      onRenderError: params && params.onRenderError,
      renderMode: params?.renderMode,
      syncColors: params?.syncColors,
      hasCompatibleActions: params?.hasCompatibleActions,
    });
    this.render$ = this.renderHandler.render$;
    this.update$ = this.renderHandler.update$;
    this.events$ = this.renderHandler.events$;

    this.update$.subscribe((value) => {
      if (value) {
        const { newExpression, newParams } = value;
        this.update(newExpression, newParams);
      }
    });

    this.data$.subscribe((data) => {
      this.render(data);
    });

    this.render$.subscribe(() => {
      this.loadingSubject.next(false);
    });

    this.setParams(params);

    if (expression) {
      this.loadingSubject.next(true);
      this.loadData(expression, this.params);
    }
  }

  destroy() {
    this.dataSubject.complete();
    this.loadingSubject.complete();
    this.renderHandler.destroy();
    if (this.execution) {
      this.execution.cancel();
    }
  }

  cancel() {
    if (this.execution) {
      this.execution.cancel();
    }
  }

  getExpression(): string | undefined {
    if (this.execution) {
      return this.execution.getExpression();
    }
  }

  getAst(): ExpressionAstExpression | undefined {
    if (this.execution) {
      return this.execution.getAst();
    }
  }

  getElement(): HTMLElement {
    return this.renderHandler.getElement();
  }

  inspect(): Adapters | undefined {
    return this.execution ? (this.execution.inspect() as Adapters) : undefined;
  }

  update(expression?: string | ExpressionAstExpression, params?: IExpressionLoaderParams): void {
    this.setParams(params);

    this.loadingSubject.next(true);
    if (expression) {
      this.loadData(expression, this.params);
    } else if (this.data) {
      this.render(this.data);
    }
  }

  private loadData = async (
    expression: string | ExpressionAstExpression,
    params: IExpressionLoaderParams
  ): Promise<void> => {
    if (this.execution && this.execution.isPending) {
      this.execution.cancel();
    }
    this.setParams(params);
    this.execution = getExpressionsService().execute(expression, params.context, {
      searchContext: params.searchContext,
      variables: params.variables || {},
      inspectorAdapters: params.inspectorAdapters,
      searchSessionId: params.searchSessionId,
      debug: params.debug,
      syncColors: params.syncColors,
    });

    const prevDataHandler = this.execution;
    const data = await prevDataHandler.getData();
    if (this.execution !== prevDataHandler) {
      return;
    }
    this.dataSubject.next(data);
  };

  private render(data: Data): void {
    this.renderHandler.render(data, this.params.uiState);
  }

  private setParams(params?: IExpressionLoaderParams) {
    if (!params || !Object.keys(params).length) {
      return;
    }

    if (params.searchContext) {
      this.params.searchContext = defaults(
        {},
        params.searchContext,
        this.params.searchContext || {}
      ) as any;
    }
    if (params.uiState && this.params) {
      this.params.uiState = params.uiState;
    }
    if (params.variables && this.params) {
      this.params.variables = params.variables;
    }
    if (params.searchSessionId && this.params) {
      this.params.searchSessionId = params.searchSessionId;
    }
    this.params.syncColors = params.syncColors;
    this.params.debug = Boolean(params.debug);

    this.params.inspectorAdapters = (params.inspectorAdapters ||
      this.execution?.inspect()) as Adapters;
  }
}

export type IExpressionLoader = (
  element: HTMLElement,
  expression: string | ExpressionAstExpression,
  params: IExpressionLoaderParams
) => ExpressionLoader;

export const loader: IExpressionLoader = (element, expression, params) => {
  return new ExpressionLoader(element, expression, params);
};
