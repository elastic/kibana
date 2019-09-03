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
import { share, first } from 'rxjs/operators';
import { renderersRegistry } from '../../../../interpreter/public/registries';
import { event, RenderId, Data, IInterpreterRenderHandlers } from './_types';

export class ExpressionRenderHandler {
  render$: Observable<RenderId>;
  update$: Observable<any>;
  events$: Observable<event>;

  private element: HTMLElement;
  private destroyFn?: any;
  private renderCount: number = 0;
  private handlers: IInterpreterRenderHandlers;

  constructor(element: HTMLElement) {
    this.element = element;

    const eventsSubject = new Rx.Subject();
    this.events$ = eventsSubject.asObservable().pipe(share());

    const renderSubject = new Rx.Subject();
    this.render$ = renderSubject.asObservable().pipe(share());

    const updateSubject = new Rx.Subject();
    this.update$ = updateSubject.asObservable().pipe(share());

    this.handlers = {
      onDestroy: (fn: any) => {
        this.destroyFn = fn;
      },
      done: () => {
        this.renderCount++;
        renderSubject.next(this.renderCount);
      },
      reload: () => {
        updateSubject.next(null);
      },
      update: params => {
        updateSubject.next(params);
      },
      event: data => {
        eventsSubject.next(data);
      },
    };
  }

  render = async (data: Data) => {
    if (data.type !== 'render' || !data.as) {
      throw new Error('invalid data provided to expression renderer');
    }

    if (!renderersRegistry.get(data.as)) {
      throw new Error(`invalid renderer id '${data.as}'`);
    }

    const promise = this.render$.pipe(first()).toPromise();

    renderersRegistry.get(data.as).render(this.element, data.value, this.handlers);

    return promise;
  };

  destroy = () => {
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
