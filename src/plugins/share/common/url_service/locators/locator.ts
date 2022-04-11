/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SavedObjectReference } from 'kibana/server';
import { DependencyList } from 'react';
import type { PersistableState } from 'src/plugins/kibana_utils/common';
import { useLocatorUrl } from './use_locator_url';
import type {
  LocatorDefinition,
  LocatorPublic,
  KibanaLocation,
  LocatorNavigationParams,
  LocatorGetUrlParams,
} from './types';
import { formatSearchParams, FormatSearchParamsOptions, RedirectOptions } from './redirect';

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

  public getRedirectUrl(params: P, options: FormatSearchParamsOptions = {}): string {
    const { baseUrl = '', version = '0.0.0' } = this.deps;
    const redirectOptions: RedirectOptions = {
      id: this.definition.id,
      version,
      params,
    };
    const formatOptions: FormatSearchParamsOptions = {
      ...options,
      lzCompress: options.lzCompress ?? true,
    };
    const search = formatSearchParams(redirectOptions, formatOptions).toString();

    return baseUrl + '/app/r?' + search;
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
}
