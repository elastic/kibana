/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type {
  MigrateFunctionsObject,
  GetMigrationFunctionObjectFn,
} from '@kbn/kibana-utils-plugin/common';
import type {
  LocatorGetUrlParams,
  FormatSearchParamsOptions,
  LocatorNavigationParams,
} from '@kbn/share-plugin/common/url_service';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import { History } from 'history';
import type { DependencyList } from 'react';
import { getProfile } from '../../common/customizations';
import { HistoryLocationState } from '../build_services';

export class ProfileAwareLocator<T extends { profile?: string }> implements LocatorPublic<T> {
  id: string;
  migrations: MigrateFunctionsObject | GetMigrationFunctionObjectFn;

  constructor(
    private readonly locator: LocatorPublic<T>,
    private readonly history: History<HistoryLocationState>
  ) {
    this.id = locator.id;
    this.migrations = locator.migrations;
  }

  private injectProfile(params: T) {
    if (params.profile) {
      return params;
    }

    const { profile } = getProfile(this.history.location.pathname);

    if (profile) {
      params = { ...params, profile };
    }

    return params;
  }

  getLocation(params: T) {
    return this.locator.getLocation(this.injectProfile(params));
  }

  getUrl(params: T, getUrlParams?: LocatorGetUrlParams) {
    return this.locator.getUrl(this.injectProfile(params), getUrlParams);
  }

  getRedirectUrl(params: T, options?: FormatSearchParamsOptions) {
    return this.locator.getRedirectUrl(this.injectProfile(params), options);
  }

  navigate(params: T, navigationParams?: LocatorNavigationParams) {
    return this.locator.navigate(this.injectProfile(params), navigationParams);
  }

  navigateSync(params: T, navigationParams?: LocatorNavigationParams) {
    return this.locator.navigateSync(this.injectProfile(params), navigationParams);
  }

  useUrl(
    params: T,
    getUrlParams?: LocatorGetUrlParams | undefined,
    deps?: DependencyList | undefined
  ) {
    return this.locator.useUrl(this.injectProfile(params), getUrlParams, deps);
  }

  telemetry(state: T, stats: Record<string, unknown>) {
    return this.locator.telemetry(this.injectProfile(state), stats);
  }

  inject(state: T, references: SavedObjectReference[]) {
    return this.locator.inject(this.injectProfile(state), references);
  }

  extract(state: T) {
    return this.locator.extract(this.injectProfile(state));
  }
}
