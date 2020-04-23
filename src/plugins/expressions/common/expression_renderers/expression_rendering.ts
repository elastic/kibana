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

import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IInterpreterRenderHandlers } from './types';
import { ExecutionContextSearch } from '../execution';
import { ExpressionValue, ExpressionAstExpression, ExpressionRendererRegistry } from '../../public';
import { Adapters } from '../../../inspector/public';

// import { getNotifications } from './services';
// import { getRenderersRegistry } from './services';
/*
export const onRenderErrorDefault: RenderErrorHandlerFnType = (
  element: HTMLElement,
  error: RenderError,
  handlers: IInterpreterRenderHandlers
) => {
  if (error.name === 'AbortError') {
    handlers.done();
    return;
  }

  getNotifications().toasts.addError(error, {
    title: i18n.translate('expressions.defaultErrorRenderer.errorTitle', {
      defaultMessage: 'Error in expression',
    }),
    toastMessage: error.message,
  });
  handlers.done();
};
*/

export const onRenderErrorDefault: RenderErrorHandlerFnType = (element, error, handlers) => {
  // eslint-disable-next-line no-console
  console.error(error);
  handlers.done();
};

export interface RenderError extends Error {
  type?: string;
}

export type RenderErrorHandlerFnType = (
  domNode: HTMLElement,
  error: RenderError,
  handlers: IInterpreterRenderHandlers
) => void;

export interface IExpressionLoaderParams {
  searchContext?: ExecutionContextSearch;
  context?: ExpressionValue;
  variables?: Record<string, any>;
  disableCaching?: boolean;
  customFunctions?: [];
  customRenderers?: [];
  uiState?: unknown;
  inspectorAdapters?: Adapters;
  onRenderError?: RenderErrorHandlerFnType;
}

export type IExpressionRendererExtraHandlers = Record<string, any>;

interface Event {
  name: string;
  data: any;
}

interface UpdateValue {
  newExpression?: string | ExpressionAstExpression;
  newParams: IExpressionLoaderParams;
}

export interface ExpressionRenderingParams {
  readonly renderers: ExpressionRendererRegistry;
  readonly element: HTMLElement;
  readonly onRenderError?: RenderErrorHandlerFnType;
}

/**
 * Constructs expression renderer handlers and passes them to expression renderer.
 */
export class ExpressionRendering {
  private destroyFn?: any;
  private renderCount: number = 0;
  private renderSubject: Rx.BehaviorSubject<number | null>;
  private eventsSubject: Rx.Subject<unknown>;
  private updateSubject: Rx.Subject<UpdateValue | null>;
  private handlers: IInterpreterRenderHandlers;

  constructor(private readonly params: ExpressionRenderingParams) {
    this.eventsSubject = new Rx.Subject();
    this.events$ = this.eventsSubject.asObservable() as Observable<Event>;

    this.renderSubject = new Rx.BehaviorSubject(null as any | null);
    this.render$ = this.renderSubject.asObservable().pipe(filter(_ => _ !== null)) as Observable<
      any
    >;

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
      update: value => {
        this.updateSubject.next(value);
      },
      event: data => {
        this.eventsSubject.next(data);
      },
    };
  }

  private handleRenderError(error: RenderError) {
    (this.params.onRenderError || onRenderErrorDefault)(this.params.element, error, this.handlers);
  }

  // Public API ----------------------------------------------------------------

  public readonly render$: Observable<number>;
  public readonly update$: Observable<UpdateValue | null>;
  public readonly events$: Observable<Event>;

  public readonly render = async (data: any, uiState: any = {}) => {
    if (!data || typeof data !== 'object') {
      return this.handleRenderError(new Error('invalid data provided to the expression renderer'));
    }

    if (data.type !== 'render' || !data.as) {
      if (data.type === 'error') {
        return this.handleRenderError(data.error);
      } else {
        return this.handleRenderError(
          new Error('invalid data provided to the expression renderer')
        );
      }
    }

    if (!this.params.renderers.has(data.as)) {
      return this.handleRenderError(new Error(`invalid renderer id '${data.as}'`));
    }

    try {
      // Rendering is asynchronous, completed by handlers.done()
      await this.params.renderers.get(data.as)!.render(this.params.element, data.value, {
        ...this.handlers,
        uiState,
      } as any);
    } catch (e) {
      return this.handleRenderError(e);
    }
  };

  public readonly destroy = () => {
    this.renderSubject.complete();
    this.eventsSubject.complete();
    this.updateSubject.complete();
    if (this.destroyFn) {
      this.destroyFn();
    }
  };

  public readonly getElement = () => this.params.element;
}
