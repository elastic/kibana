/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DependencyList } from 'react';
import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { useLocatorUrl } from './use_locator_url';
import type {
  LocatorDefinition,
  LocatorPublic,
  KibanaLocation,
  LocatorNavigationParams,
  LocatorGetUrlParams,
} from './types';
import type { FormatSearchParamsOptions, RedirectOptions, GetRedirectUrlOptions } from './redirect';
import { formatSearchParams, addSpaceIdToPath } from './redirect';

export interface LocatorDependencies {
  /**
   * Public URL of the Kibana server.
   */
  baseUrl?: string;

  /**
   * Current version of Kibana, e.g. `7.0.0`.
   */
  version?: string;

  /**
   * Navigate without reloading the page to a KibanaLocation.
   */
  navigate: (location: KibanaLocation, params?: LocatorNavigationParams) => Promise<void>;

  /**
   * Resolve a Kibana URL given KibanaLocation.
   */
  getUrl: (location: KibanaLocation, getUrlParams: LocatorGetUrlParams) => Promise<string>;
}

export class Locator<P extends SerializableRecord> implements LocatorPublic<P> {
  public readonly id: string;
  public readonly migrations: PersistableState<P>['migrations'];

  constructor(
    public readonly definition: LocatorDefinition<P>,
    protected readonly deps: LocatorDependencies
  ) {
    this.id = definition.id;
    this.migrations = definition.migrations || {};

    // Ensure getTimeRange and setTimeRange or neither at runtime
    //
    // Unable to ensure at compile time because
    // TypeScript requires Discriminated Union for "all-or-none" constraint for a set of optional methods
    // and classes can not implement dynamic types.
    const hasGetTimeRange = 'getTimeRange' in definition;
    const hasSetTimeRange = 'setTimeRange' in definition;
    if (hasGetTimeRange !== hasSetTimeRange) {
      throw new Error(
        'LocatorDefinition must provide both getTimeRange and setTimeRange or neither.'
      );
    }
  }

  // PersistableState<P> -------------------------------------------------------

  public readonly telemetry: PersistableState<P>['telemetry'] = (
    state: P,
    stats: Record<string, any>
  ): Record<string, any> => {
    return this.definition.telemetry ? this.definition.telemetry(state, stats) : stats;
  };

  public readonly inject: PersistableState<P>['inject'] = (
    state: P,
    references: SavedObjectReference[]
  ): P => {
    if (!this.definition.inject) return state;
    return this.definition.inject(state, references);
  };

  public readonly extract: PersistableState<P>['extract'] = (
    state: P
  ): { state: P; references: SavedObjectReference[] } => {
    if (!this.definition.extract) return { state, references: [] };
    return this.definition.extract(state);
  };

  // LocatorPublic<P> ----------------------------------------------------------

  public async getLocation(params: P): Promise<KibanaLocation> {
    return await this.definition.getLocation(params);
  }

  public async getUrl(params: P, { absolute = false }: LocatorGetUrlParams = {}): Promise<string> {
    const location = await this.getLocation(params);
    const url = this.deps.getUrl(location, { absolute });

    return url;
  }

  public getRedirectUrl(params: P, options: GetRedirectUrlOptions = {}): string {
    const { baseUrl = '', version = '0.0.0' } = this.deps;
    const redirectOptions: RedirectOptions = {
      id: this.definition.id,
      version,
      params,
    };
    const formatOptions: FormatSearchParamsOptions = {
      lzCompress: options.lzCompress ?? true,
    };
    const search = formatSearchParams(redirectOptions, formatOptions).toString();
    const path = '/app/r?' + search;

    if (options.spaceId) {
      return addSpaceIdToPath(baseUrl, options.spaceId, path);
    } else {
      return baseUrl + path;
    }
  }

  public async navigate(
    params: P,
    { replace = false }: LocatorNavigationParams = {}
  ): Promise<void> {
    const location = await this.getLocation(params);

    await this.deps.navigate(location, {
      replace,
    });
  }

  public navigateSync(locatorParams: P, navigationParams: LocatorNavigationParams = {}): void {
    this.navigate(locatorParams, navigationParams).catch((error) => {
      // eslint-disable-next-line no-console
      console.log(`Failed to navigate [locator = ${this.id}].`, locatorParams, navigationParams);
      // eslint-disable-next-line no-console
      console.error(error);
    });
  }

  public readonly useUrl = (
    params: P,
    getUrlParams?: LocatorGetUrlParams,
    deps: DependencyList = []
  ): string => useLocatorUrl<P>(this, params, getUrlParams, deps);

  public getTimeRange(params: P) {
    return this.definition.getTimeRange?.(params);
  }

  public setTimeRange(params: P, timeRange?: TimeRange): P {
    return this.definition.setTimeRange ? this.definition.setTimeRange(params) : params;
  }
}
