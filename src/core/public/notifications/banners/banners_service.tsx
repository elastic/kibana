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
import { map } from 'rxjs/operators';

import { GlobalBannerList } from './global_banner_list';

export interface Banner {
  readonly id: string;
  readonly component: React.ReactChild;
  readonly priority: number;
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
    const sortedBanners$ = banners$.pipe(
      map(banners => banners.slice().sort((a, b) => b.priority - a.priority))
    );

    render(<GlobalBannerList banners$={sortedBanners$} />, this.params.targetDomElement);

    return {
      /**
       * Add a component that should be rendered at the top of the page along with an optional priority.
       */
      add: (component: React.ReactChild, priority = 0) => {
        const id = `${++uniqueId}`;
        banners$.next([...banners$.getValue(), { id, component, priority }]);
        return id;
      },

      /**
       * Remove a component from the top of the page.
       */
      remove: (id: string) => {
        banners$.next(banners$.getValue().filter(banner => banner.id !== id));
      },

      /**
       * Replace a banner component with a new one, potentially with a new priority
       */
      replace: (id: string, component: React.ReactChild, priority = 0) => {
        const newId = `${++uniqueId}`;
        banners$.next([
          ...banners$.getValue().filter(banner => banner.id !== id),
          { id: newId, component, priority },
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
