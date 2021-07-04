/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectReference } from 'kibana/server';
import { DependencyList } from 'react';
import type { PersistableState, SerializableState } from 'src/plugins/kibana_utils/common';
import { useLocatorUrl } from './use_locator_url';
import type {
  LocatorDefinition,
  LocatorPublic,
  KibanaLocation,
  LocatorNavigationParams,
  LocatorGetUrlParams,
} from './types';

export interface LocatorDependencies {
  /**
   * Navigate without reloading the page to a KibanaLocation.
   */
  navigate: (location: KibanaLocation, params?: LocatorNavigationParams) => Promise<void>;

  /**
   * Resolve a Kibana URL given KibanaLocation.
   */
  getUrl: (location: KibanaLocation, getUrlParams: LocatorGetUrlParams) => Promise<string>;
}

export class Locator<P extends SerializableState> implements PersistableState<P>, LocatorPublic<P> {
  public readonly migrations: PersistableState<P>['migrations'];

  constructor(
    public readonly definition: LocatorDefinition<P>,
    protected readonly deps: LocatorDependencies
  ) {
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
    return this.definition.inject ? this.definition.inject(state, references) : state;
  };

  public readonly extract: PersistableState<P>['extract'] = (
    state: P
  ): { state: P; references: SavedObjectReference[] } => {
    return this.definition.extract ? this.definition.extract(state) : { state, references: [] };
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

  public async navigate(
    params: P,
    { replace = false }: LocatorNavigationParams = {}
  ): Promise<void> {
    const location = await this.getLocation(params);

    await this.deps.navigate(location, {
      replace,
    });
  }

  /* eslint-disable react-hooks/rules-of-hooks */
  public readonly useUrl = (
    params: P,
    getUrlParams?: LocatorGetUrlParams,
    deps: DependencyList = []
  ): string => useLocatorUrl<P>(this, params, getUrlParams, deps);
  /* eslint-enable react-hooks/rules-of-hooks */
}
