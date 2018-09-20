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

import * as Url from 'url';

import * as Rx from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  startWith,
  takeUntil,
  tap,
} from 'rxjs/operators';

import { BasePathStartContract } from '../base_path';
import { InjectedMetadataStartContract } from '../injected_metadata';
import { shareWeakReplay } from '../utils';
import { PrefixedStorage } from './prefixed_storage';

/**
 * The properties that can be set using start.decorate()
 */
interface Decoration {
  hidden?: boolean;
  tooltip?: string;
  disabled?: boolean;
}

type UrlInterceptor = (url: string) => string | void;

export interface NavLink {
  readonly id: string;
  readonly active: boolean;
  readonly lastSubUrl?: string;
  readonly title: string;
  readonly order: number;
  readonly url: string;
  readonly linkToLastSubUrl: boolean;
  readonly subUrlBase: string;
  readonly icon: string;
  readonly hidden: boolean;
  readonly disabled: boolean;
  readonly tooltip?: string;
  readonly description?: string;
}
export type NavLinks = ReadonlyArray<NavLink>;
export type NavLinksStartContract = ReturnType<NavLinksService['start']>;

interface Deps {
  basePath: BasePathStartContract;
  injectedMetadata: InjectedMetadataStartContract;
}

export class NavLinksService {
  private readonly stop$ = new Rx.ReplaySubject(1);

  public start({ injectedMetadata, basePath }: Deps) {
    const lastUrlStorage = new PrefixedStorage(window.sessionStorage, `lastUrl:${basePath.get()}`);
    const pullLastUrlStorage$ = new Rx.Subject();

    const showOnly$ = new Rx.BehaviorSubject<string | void>(undefined);
    const decorations$ = new Rx.BehaviorSubject<Record<string, Decoration>>({});
    const urlInterceptor$ = new Rx.BehaviorSubject<UrlInterceptor | void>(undefined);

    // basic properties for navLinks, currently just read from injected metadata
    // but will probably include links from application service soon
    const baseNavLinks$ = Rx.of(
      injectedMetadata.getNavLinks().map(injected => ({
        id: injected.id,
        title: injected.title,
        order: injected.order,
        url: Url.resolve(window.location.href, injected.url),
        subUrlBase: Url.resolve(window.location.href, injected.subUrlBase),
        icon: Url.resolve(window.location.href, basePath.addToPath(`/${injected.icon}`)),
        linkToLastSubUrl: injected.linkToLastSubUrl,
        hidden: !!injected.hidden,
        disabled: !!injected.disabled,
        tooltip: injected.tooltip,
        description: injected.description,
      }))
    );

    const checkCurrentUrl$ = new Rx.Subject();
    const currentUrl$ = Rx.merge(
      Rx.of([undefined]),
      Rx.fromEvent(window, 'hashchange'),
      checkCurrentUrl$
    ).pipe(
      map(() => window.location.href),
      distinctUntilChanged()
    );

    const trackingUrl$ = Rx.combineLatest(currentUrl$, urlInterceptor$).pipe(
      map(([currentUrl, interceptor]) => {
        if (!interceptor) {
          return currentUrl;
        }

        return interceptor(currentUrl);
      }),
      filter((url): url is string => !!url),
      shareWeakReplay(1)
    );

    const updateLastUrlStorage$ = Rx.combineLatest(trackingUrl$, baseNavLinks$).pipe(
      tap(([trackingUrl, baseNavLinks]) => {
        for (const { id, subUrlBase } of baseNavLinks) {
          if (trackingUrl.startsWith(subUrlBase)) {
            lastUrlStorage.set(id, trackingUrl);
          }
        }
      })
    );

    const createNavLinks$ = Rx.combineLatest(
      trackingUrl$,
      baseNavLinks$,
      decorations$,
      showOnly$,
      pullLastUrlStorage$.pipe(startWith(undefined))
    ).pipe(
      map(([trackingUrl, baseNavLinks, decorations, showOnly]) => {
        return Object.freeze(
          baseNavLinks
            .map(({ id, subUrlBase, ...baseProps }) => {
              const navLink: NavLink = {
                id,
                subUrlBase,
                ...baseProps,
                ...decorations[id],
                active: trackingUrl.startsWith(subUrlBase),
                lastSubUrl: lastUrlStorage.get(id),
                ...(showOnly && { hidden: showOnly !== id }),
              };

              return Object.freeze(navLink);
            })
            .sort((a, b) => a.order - b.order)
        );
      })
    );

    const navLinks$ = new Rx.BehaviorSubject<NavLinks>([]);

    // run createNavLinks$ and updateLastUrlStorage$ in the background and cache results
    // into navLinks$ subject for sync getters
    Rx.merge(updateLastUrlStorage$.pipe(ignoreElements()), createNavLinks$)
      .pipe(takeUntil(this.stop$))
      .subscribe(navLinks$);

    return {
      /**
       * Get an observable that emits snapshots of the navLinks.
       */
      get$: () => navLinks$.asObservable(),

      /**
       * Get the current lastUrl for a navLink by id.
       */
      getLastUrl: (id: string) => lastUrlStorage.get(id),

      /**
       * Set the lastUrl for a navLink by id.
       */
      setLastUrl: (id: string, lastUrl: string) => {
        lastUrlStorage.set(id, lastUrl);
        pullLastUrlStorage$.next();
      },

      /**
       * Get the default url (not the lastUrl) for a navLink by id.
       */
      getDefaultUrl: (id: string) => {
        const navLink = navLinks$.getValue().find(nl => nl.id === id);
        if (navLink) {
          return navLink.url;
        }
      },

      /**
       * Hide all navLinks other than the one with this id.
       */
      showOnly: (id: string) => {
        showOnly$.next(id);
      },

      /**
       * Filter the stored lastUrls, works like Array.filter, the lastUrl is
       * deleted unless the condition returns something truthy.
       */
      filterLastUrls: (condition: (lastUrl: string, id: string) => boolean) => {
        let updated = false;

        for (const { id } of navLinks$.getValue()) {
          const lastUrl = lastUrlStorage.get(id);
          if (lastUrl === undefined) {
            continue;
          }

          if (!condition(lastUrl, id)) {
            lastUrlStorage.delete(id);
            updated = true;
          }
        }

        if (updated) {
          pullLastUrlStorage$.next();
        }
      },

      /**
       * Add a function that receives the urls used to determine active and lastUrl states. Returning a
       * string uses that as the tracking url, returning undefined tells navLinks to ignore it.
       *
       * **NOTE:** only one interceptor is allowed at this time because that's all we need right now
       * and it avoids piling up interceptors in the browser tests where angular is initialized over
       * and over for each test.
       */
      setUrlInterceptor: (interceptor: (url: string) => string | void) => {
        urlInterceptor$.next(interceptor);
      },

      /**
       * Define arbitrary properties that will be merged into the navLink object with the
       * specified id. Cannot be used to override active, lastSubUrl, or hidden states caused
       * by `navLinks.showOnly()`.
       */
      decorate: (id: string, decoration: Decoration) => {
        const decorations = decorations$.getValue();
        decorations$.next({
          ...decorations,
          [id]: {
            ...decorations[id],
            ...decoration,
          },
        });
      },

      /**
       * Tell core.navLinks that the current url might be out of date. This method must be
       * called after using `history.pushState()` or `history.replaceState()` in order for
       * the navLinks to see the URL update since there is no way to observe url updates
       * caused with those methods.
       *
       * Angular didn't have this problem because it checked window.location.href at the start
       * of every digest cycle, we also only do this in one location and we've tried other
       * approaches but they all turn out either really hacky or turn out to have undesirable
       * side-effects. This should not be necessary once core implements some sort of routing
       * abstraction that prevents us from needing to use `history.pushState()`.
       */
      checkCurrentUrl: () => {
        checkCurrentUrl$.next();
      },
    };
  }

  public stop() {
    this.stop$.next();
  }
}
