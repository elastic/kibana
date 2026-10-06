/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { DependencyList } from 'react';
import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type {
  LocatorDefinition,
  LocatorPublic,
  KibanaLocation,
  LocatorNavigationParams,
  LocatorGetUrlParams,
} from './types';
import type { GetRedirectUrlOptions } from './redirect';
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
export declare class Locator<P extends SerializableRecord> implements LocatorPublic<P> {
  readonly definition: LocatorDefinition<P>;
  protected readonly deps: LocatorDependencies;
  readonly id: string;
  readonly migrations: PersistableState<P>['migrations'];
  constructor(definition: LocatorDefinition<P>, deps: LocatorDependencies);
  readonly telemetry: PersistableState<P>['telemetry'];
  readonly inject: PersistableState<P>['inject'];
  readonly extract: PersistableState<P>['extract'];
  getLocation(params: P): Promise<KibanaLocation>;
  getUrl(params: P, { absolute }?: LocatorGetUrlParams): Promise<string>;
  getRedirectUrl(params: P, options?: GetRedirectUrlOptions): string;
  navigate(params: P, { replace }?: LocatorNavigationParams): Promise<void>;
  navigateSync(locatorParams: P, navigationParams?: LocatorNavigationParams): void;
  readonly useUrl: (params: P, getUrlParams?: LocatorGetUrlParams, deps?: DependencyList) => string;
  getTimeRange(params: P): TimeRange | undefined;
  setTimeRange(params: P, timeRange?: TimeRange): P;
}
