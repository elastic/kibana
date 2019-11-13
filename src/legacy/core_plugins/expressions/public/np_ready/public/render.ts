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

import { Observable } from 'rxjs';
import * as Rx from 'rxjs';
import { share } from 'rxjs/operators';
import { event, RenderId, Data, IInterpreterRenderHandlers } from './types';
import { getRenderersRegistry } from './services';

interface RenderError {
  type: 'error';
  error: { type?: string; message: string };
}

export type IExpressionRendererExtraHandlers = Record<string, any>;

export class ExpressionRenderHandler {
  render$: Observable<RenderId | RenderError>;
  update$: Observable<any>;
  events$: Observable<event>;

  private element: HTMLElement;
  private destroyFn?: any;
  private renderCount: number = 0;
  private renderSubject: Rx.Subject<RenderId | RenderError>;
  private eventsSubject: Rx.Subject<unknown>;
  private updateSubject: Rx.Subject<unknown>;
  private handlers: IInterpreterRenderHandlers;

  constructor(element: HTMLElement) {
    this.element = element;

    this.eventsSubject = new Rx.Subject();
    this.events$ = this.eventsSubject.asObservable().pipe(share());

    this.renderSubject = new Rx.Subject();
    this.render$ = this.renderSubject.asObservable().pipe(share());

    this.updateSubject = new Rx.Subject();
    this.update$ = this.updateSubject.asObservable().pipe(share());

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
      update: params => {
        this.updateSubject.next(params);
      },
      event: data => {
        this.eventsSubject.next(data);
      },
    };
  }

  render = (data: Data, extraHandlers: IExpressionRendererExtraHandlers = {}) => {
    if (!data || typeof data !== 'object') {
      this.renderSubject.next({
        type: 'error',
        error: {
          message: 'invalid data provided to the expression renderer',
        },
      });
      return;
    }

    if (data.type !== 'render' || !data.as) {
      if (data.type === 'error') {
        this.renderSubject.next(data);
      } else {
        this.renderSubject.next({
          type: 'error',
          error: { message: 'invalid data provided to the expression renderer' },
        });
      }
      return;
    }

    if (!getRenderersRegistry().get(data.as)) {
      this.renderSubject.next({
        type: 'error',
        error: { message: `invalid renderer id '${data.as}'` },
      });
      return;
    }

    try {
      // Rendering is asynchronous, completed by handlers.done()
      getRenderersRegistry()
        .get(data.as)!
        .render(this.element, data.value, { ...this.handlers, ...extraHandlers });
    } catch (e) {
      this.renderSubject.next({
        type: 'error',
        error: { type: e.type, message: e.message },
      });
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
}

export function render(element: HTMLElement, data: Data): ExpressionRenderHandler {
  const handler = new ExpressionRenderHandler(element);
  handler.render(data);
  return handler;
}
