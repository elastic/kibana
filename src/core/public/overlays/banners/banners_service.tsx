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
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PriorityMap } from './priority_map';
import { BannersList } from './banners_list';
import { IUiSettingsClient } from '../../ui_settings';
import { I18nStart } from '../../i18n';
import { MountPoint } from '../../types';
import { UserBannerService } from './user_banner_service';

/** @public */
export interface OverlayBannersStart {
  /**
   * Add a new banner
   *
   * @param mount {@link MountPoint}
   * @param priority optional priority order to display this banner. Higher priority values are shown first.
   * @returns a unique identifier for the given banner to be used with {@link OverlayBannersStart.remove} and
   *          {@link OverlayBannersStart.replace}
   */
  add(mount: MountPoint, priority?: number): string;

  /**
   * Remove a banner
   *
   * @param id the unique identifier for the banner returned by {@link OverlayBannersStart.add}
   * @returns if the banner was found or not
   */
  remove(id: string): boolean;

  /**
   * Replace a banner in place
   *
   * @param id the unique identifier for the banner returned by {@link OverlayBannersStart.add}
   * @param mount {@link MountPoint}
   * @param priority optional priority order to display this banner. Higher priority values are shown first.
   * @returns a new identifier for the given banner to be used with {@link OverlayBannersStart.remove} and
   *          {@link OverlayBannersStart.replace}
   */
  replace(id: string | undefined, mount: MountPoint, priority?: number): string;

  /** @internal */
  get$(): Observable<OverlayBanner[]>;
  getComponent(): JSX.Element;
}

/** @internal */
export interface OverlayBanner {
  readonly id: string;
  readonly mount: MountPoint;
  readonly priority: number;
}

interface StartDeps {
  i18n: I18nStart;
  uiSettings: IUiSettingsClient;
}

/** @internal */
export class OverlayBannersService {
  private readonly userBanner = new UserBannerService();

  public start({ i18n, uiSettings }: StartDeps): OverlayBannersStart {
    let uniqueId = 0;
    const genId = () => `${uniqueId++}`;
    const banners$ = new BehaviorSubject(new PriorityMap<string, OverlayBanner>());

    const service: OverlayBannersStart = {
      add: (mount, priority = 0) => {
        const id = genId();
        const nextBanner: OverlayBanner = { id, mount, priority };
        banners$.next(banners$.value.add(id, nextBanner));
        return id;
      },

      remove: (id: string) => {
        if (!banners$.value.has(id)) {
          return false;
        }
        banners$.next(banners$.value.remove(id));
        return true;
      },

      replace(id: string | undefined, mount: MountPoint, priority = 0) {
        if (!id || !banners$.value.has(id)) {
          return this.add(mount, priority);
        }
        const nextId = genId();
        const nextBanner = { id: nextId, mount, priority };
        banners$.next(banners$.value.remove(id).add(nextId, nextBanner));
        return nextId;
      },

      get$() {
        return banners$.pipe(map((bannerMap) => [...bannerMap.values()]));
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
