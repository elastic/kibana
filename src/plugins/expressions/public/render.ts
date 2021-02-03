/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ExpressionRenderError, RenderErrorHandlerFnType, IExpressionLoaderParams } from './types';
import { renderErrorHandler as defaultRenderErrorHandler } from './render_error_handler';
import { IInterpreterRenderHandlers, ExpressionAstExpression, RenderMode } from '../common';

import { getRenderersRegistry } from './services';

export type IExpressionRendererExtraHandlers = Record<string, any>;

export interface ExpressionRenderHandlerParams {
  onRenderError?: RenderErrorHandlerFnType;
  renderMode?: RenderMode;
  syncColors?: boolean;
  hasCompatibleActions?: (event: ExpressionRendererEvent) => Promise<boolean>;
}

export interface ExpressionRendererEvent {
  name: string;
  data: any;
}

interface UpdateValue {
  newExpression?: string | ExpressionAstExpression;
  newParams: IExpressionLoaderParams;
}

export class ExpressionRenderHandler {
  render$: Observable<number>;
  update$: Observable<UpdateValue | null>;
  events$: Observable<ExpressionRendererEvent>;

  private element: HTMLElement;
  private destroyFn?: any;
  private renderCount: number = 0;
  private renderSubject: Rx.BehaviorSubject<number | null>;
  private eventsSubject: Rx.Subject<unknown>;
  private updateSubject: Rx.Subject<UpdateValue | null>;
  private handlers: IInterpreterRenderHandlers;
  private onRenderError: RenderErrorHandlerFnType;

  constructor(
    element: HTMLElement,
    {
      onRenderError,
      renderMode,
      syncColors,
      hasCompatibleActions = async () => false,
    }: ExpressionRenderHandlerParams = {}
  ) {
    this.element = element;

    this.eventsSubject = new Rx.Subject();
    this.events$ = this.eventsSubject.asObservable() as Observable<ExpressionRendererEvent>;

    this.onRenderError = onRenderError || defaultRenderErrorHandler;

    this.renderSubject = new Rx.BehaviorSubject(null as any | null);
    this.render$ = this.renderSubject
      .asObservable()
      .pipe(filter((_) => _ !== null)) as Observable<any>;

    this.updateSubject = new Rx.Subject();
    this.update$ = this.updateSubject.asObservable();

    this.handlers = {
      onDestroy: (fn: any) => {
        this.destroyFn = fn;
      },
      done: () => {
        this.renderCount++;
        this.renderSubject.next(this.renderCount);
      },
      reload: () => {
        this.updateSubject.next(null);
      },
      update: (params) => {
        this.updateSubject.next(params);
      },
      event: (data) => {
        this.eventsSubject.next(data);
      },
      getRenderMode: () => {
        return renderMode || 'display';
      },
      isSyncColorsEnabled: () => {
        return syncColors || false;
      },
      hasCompatibleActions,
    };
  }

  render = async (value: any, uiState?: any) => {
    if (!value || typeof value !== 'object') {
      return this.handleRenderError(new Error('invalid data provided to the expression renderer'));
    }

    if (value.type !== 'render' || !value.as) {
      if (value.type === 'error') {
        return this.handleRenderError(value.error);
      } else {
        return this.handleRenderError(
          new Error('invalid data provided to the expression renderer')
        );
      }
    }

    if (!getRenderersRegistry().get(value.as)) {
      return this.handleRenderError(new Error(`invalid renderer id '${value.as}'`));
    }

    try {
      // Rendering is asynchronous, completed by handlers.done()
      await getRenderersRegistry()
        .get(value.as)!
        .render(this.element, value.value, {
          ...this.handlers,
          uiState,
        } as any);
    } catch (e) {
      return this.handleRenderError(e);
    }
  };

  destroy = () => {
    this.renderSubject.complete();
    this.eventsSubject.complete();
    this.updateSubject.complete();
    if (this.destroyFn) {
      this.destroyFn();
    }
  };

  getElement = () => {
    return this.element;
  };

  handleRenderError = (error: ExpressionRenderError) => {
    this.onRenderError(this.element, error, this.handlers);
  };
}

export function render(
  element: HTMLElement,
  data: any,
  options?: ExpressionRenderHandlerParams
): ExpressionRenderHandler {
  const handler = new ExpressionRenderHandler(element, options);
  handler.render(data);
  return handler;
}
