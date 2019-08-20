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

import { sortBy } from 'lodash';
import React from 'react';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BannersList } from './banners_list';
import { UiSettingsClientContract } from '../../ui_settings';
import { I18nStart } from '../../i18n';
import { UserBannerService } from './user_banner_service';

/**
 * A function that will unmount the banner from the element.
 * @public
 */
export type OverlayBannerUnmount = () => void;

/**
 * A function that will mount the banner inside the provided element.
 * @param element an element to render into
 * @returns a {@link OverlayBannerUnmount}
 * @public
 */
export type OverlayBannerMount = (element: HTMLElement) => OverlayBannerUnmount;

/** @public */
export interface OverlayBannersStart {
  /**
   * Add a new banner
   *
   * @param mount {@link OverlayBannerMount}
   * @param priority optional priority order to display this banner. Higher priority values are shown first.
   * @returns a unique symbol for the given banner to be used with {@link OverlayBannersStart.remove} and
   *          {@link OverlayBannersStart.replace}
   */
  add(mount: OverlayBannerMount, priority?: number): symbol;

  /**
   * Remove a banner
   *
   * @param id the unique symbol for the banner returned by {@link OverlayBannersStart.add}
   * @returns if the banner was found or not
   */
  remove(id: symbol): boolean;

  /**
   * Replace a banner in place
   *
   * @param id the unique symbol for the banner returned by {@link OverlayBannersStart.add}
   * @param mount {@link OverlayBannerMount}
   * @param priority optional priority order to display this banner. Higher priority values are shown first.
   * @returns a new symbol for the given banner to be used with {@link OverlayBannersStart.remove} and
   *          {@link OverlayBannersStart.replace}
   */
  replace(id: symbol | undefined, mount: OverlayBannerMount, priority?: number): symbol;

  /** @internal */
  get$(): Observable<OverlayBanner[]>;
  getComponent(): JSX.Element;
}

/** @internal */
export interface OverlayBanner {
  id: symbol;
  mount: OverlayBannerMount;
  priority: number;
}

interface StartDeps {
  i18n: I18nStart;
  uiSettings: UiSettingsClientContract;
}

/** @internal */
export class OverlayBannersService {
  private readonly userBanner = new UserBannerService();

  public start({ i18n, uiSettings }: StartDeps): OverlayBannersStart {
    const banners$ = new BehaviorSubject<ReadonlyMap<symbol, OverlayBanner>>(new Map());

    const addToMap = (banners: ReadonlyMap<symbol, OverlayBanner>, bannerToAdd: OverlayBanner) => {
      return new Map(
        // Filter by descending priority
        sortBy([...banners.values(), bannerToAdd], 'priority')
          .reverse()
          .map(banner => [banner.id, banner])
      );
    };

    const removeFromMap = (banners: ReadonlyMap<symbol, OverlayBanner>, id: symbol) => {
      return new Map([...banners].filter(([bannerId]) => bannerId !== id));
    };

    const service: OverlayBannersStart = {
      add: (mount, priority = 0) => {
        const id = Symbol();
        const nextBanner: OverlayBanner = { id, mount, priority };
        banners$.next(addToMap(banners$.value, nextBanner));
        return id;
      },

      remove: (id: symbol) => {
        if (!banners$.value.has(id)) {
          return false;
        }

        banners$.next(removeFromMap(banners$.value, id));

        return true;
      },

      replace(id: symbol | undefined, mount: OverlayBannerMount, priority = 0) {
        if (!id || !banners$.value.has(id)) {
          return this.add(mount, priority);
        }

        const nextId = Symbol();
        const nextBanner = { id: nextId, mount, priority };

        banners$.next(addToMap(removeFromMap(banners$.value, id), nextBanner));
        return nextId;
      },

      get$() {
        return banners$.pipe(map(bannerMap => [...bannerMap.values()]));
      },

      getComponent() {
        return <BannersList banners$={this.get$()} />;
      },
    };

    this.userBanner.start({ banners: service, i18n, uiSettings });

    return service;
  }

  public stop() {
    this.userBanner.stop();
  }
}
