/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { isNumber } from 'lodash';
import { SerializableRecord } from '@kbn/utility-types';
import {
  ExpressionRenderError,
  RenderErrorHandlerFnType,
  IExpressionLoaderParams,
  ExpressionRendererEvent,
} from './types';
import { renderErrorHandler as defaultRenderErrorHandler } from './render_error_handler';
import { IInterpreterRenderHandlers, IInterpreterRenderUpdateParams, RenderMode } from '../common';

import { getRenderersRegistry } from './services';

export type IExpressionRendererExtraHandlers = Record<string, unknown>;

export interface ExpressionRenderHandlerParams {
  onRenderError?: RenderErrorHandlerFnType;
  renderMode?: RenderMode;
  syncColors?: boolean;
  syncTooltips?: boolean;
  interactive?: boolean;
  hasCompatibleActions?: (event: ExpressionRendererEvent) => Promise<boolean>;
}

type UpdateValue = IInterpreterRenderUpdateParams<IExpressionLoaderParams>;

export class ExpressionRenderHandler {
  render$: Observable<number>;
  update$: Observable<UpdateValue | null>;
  events$: Observable<ExpressionRendererEvent>;

  private element: HTMLElement;
  private destroyFn?: Function;
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
      syncTooltips,
      interactive,
      hasCompatibleActions = async () => false,
    }: ExpressionRenderHandlerParams = {}
  ) {
    this.element = element;

    this.eventsSubject = new Rx.Subject();
    this.events$ = this.eventsSubject.asObservable() as Observable<ExpressionRendererEvent>;

    this.onRenderError = onRenderError || defaultRenderErrorHandler;

    this.renderSubject = new Rx.BehaviorSubject<number | null>(null);
    this.render$ = this.renderSubject.asObservable().pipe(filter(isNumber));

    this.updateSubject = new Rx.Subject();
    this.update$ = this.updateSubject.asObservable();

    this.handlers = {
      onDestroy: (fn: Function) => {
        this.destroyFn = fn;
      },
      done: () => {
        this.renderCount++;
        this.renderSubject.next(this.renderCount);
      },
      reload: () => {
        this.updateSubject.next(null);
      },
      update: (params: UpdateValue) => {
        this.updateSubject.next(params);
      },
      event: (data) => {
        this.eventsSubject.next(data);
      },
      getRenderMode: () => {
        return renderMode || 'view';
      },
      isSyncColorsEnabled: () => {
        return syncColors || false;
      },
      isSyncTooltipsEnabled: () => {
        return syncTooltips || false;
      },
      isInteractive: () => {
        return interactive ?? true;
      },
      hasCompatibleActions,
    };
  }

  render = async (value: SerializableRecord, uiState?: unknown) => {
    if (!value || typeof value !== 'object') {
      return this.handleRenderError(new Error('invalid data provided to the expression renderer'));
    }

    if (value.type !== 'render' || !value.as) {
      if (value.type === 'error') {
        return this.handleRenderError(value.error as unknown as ExpressionRenderError);
      } else {
        return this.handleRenderError(
          new Error('invalid data provided to the expression renderer')
        );
      }
    }

    if (!getRenderersRegistry().get(value.as as string)) {
      return this.handleRenderError(new Error(`invalid renderer id '${value.as}'`));
    }

    try {
      // Rendering is asynchronous, completed by handlers.done()
      await getRenderersRegistry()
        .get(value.as as string)!
        .render(this.element, value.value, {
          ...this.handlers,
          uiState,
        });
    } catch (e) {
      return this.handleRenderError(e as ExpressionRenderError);
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

export type IExpressionRenderer = (
  element: HTMLElement,
  data: unknown,
  options?: ExpressionRenderHandlerParams
) => Promise<ExpressionRenderHandler>;

export const render: IExpressionRenderer = async (element, data, options) => {
  const handler = new ExpressionRenderHandler(element, options);
  handler.render(data as SerializableRecord);
  return handler;
};
