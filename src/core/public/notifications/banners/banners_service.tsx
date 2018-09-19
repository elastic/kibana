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

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import * as Rx from 'rxjs';

import { GlobalBannersContainer } from './containers/global_banners_container';

export interface Banner {
  readonly id: string;
  readonly priority: number;
  readonly render: (targetDomElement: HTMLDivElement) => (() => void) | void;
}

export type Banners = Banner[];

interface Params {
  targetDomElement: HTMLElement;
}

export class BannersService {
  constructor(private readonly params: Params) {}

  public start() {
    let uniqueId = 0;
    const banners$ = new Rx.BehaviorSubject<Banners>([]);

    render(
      <GlobalBannersContainer banners$={banners$.asObservable()} />,
      this.params.targetDomElement
    );

    return {
      /**
       * Add a banner that should be rendered at the top of the page along with an optional priority.
       */
      add: (renderFn: Banner['render'], priority = 0) => {
        const id = `${++uniqueId}`;
        banners$.next([...banners$.getValue(), { id, priority, render: renderFn }]);
        return id;
      },

      /**
       * Remove a banner from the top of the page.
       */
      remove: (id: string) => {
        banners$.next(banners$.getValue().filter(banner => banner.id !== id));
      },

      /**
       * Replace a banner and its priority. If the render function is not === to the
       * previous render function the previous banner will be unmounted and re-rendered.
       */
      replace: (id: string, renderFn: Banner['render'], priority = 0) => {
        const newId = `${++uniqueId}`;
        banners$.next([
          ...banners$.getValue().filter(banner => banner.id !== id),
          { id: newId, priority, render: renderFn },
        ]);
        return newId;
      },
    };
  }

  public stop() {
    unmountComponentAtNode(this.params.targetDomElement);
    this.params.targetDomElement.textContent = '';
  }
}

export type BannersStartContract = ReturnType<BannersService['start']>;
