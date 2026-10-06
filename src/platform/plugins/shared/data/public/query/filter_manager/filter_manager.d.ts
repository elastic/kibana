/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { FilterStateStore } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import type { PersistableStateService } from '@kbn/kibana-utils-plugin/common/persistable_state';
import type {
  getAllMigrations,
  inject,
  extract,
  telemetry,
} from '../../../common/query/filters/persistable_state';
interface PartitionedFilters {
  globalFilters: Filter[];
  appFilters: Filter[];
}
export declare class FilterManager implements PersistableStateService<Filter[]> {
  private filters;
  private updated$;
  private fetch$;
  private uiSettings;
  constructor(uiSettings: IUiSettingsClient);
  private mergeIncomingFilters;
  private static mergeFilters;
  private static partitionFilters;
  private handleStateUpdate;
  getFilters(): Filter[];
  getAppFilters(): Filter[];
  getGlobalFilters(): Filter[];
  getPartitionedFilters(): PartitionedFilters;
  getUpdates$(): import('rxjs').Observable<void>;
  getFetches$(): import('rxjs').Observable<void>;
  addFilters(filters: Filter[] | Filter, pinFilterStatus?: boolean): void;
  setFilters(newFilters: Filter[], pinFilterStatus?: boolean): void;
  /**
   * Sets new global filters and leaves app filters untouched,
   * Removes app filters for which there is a duplicate within new global filters
   * @param newGlobalFilters
   */
  setGlobalFilters(newGlobalFilters: Filter[]): void;
  /**
   * Sets new app filters and leaves global filters untouched,
   * Removes app filters for which there is a duplicate within new global filters
   * @param newAppFilters
   */
  setAppFilters(newAppFilters: Filter[]): void;
  removeFilter(filter: Filter): void;
  removeAll(): void;
  static setFiltersStore(
    filters: Filter[],
    store: FilterStateStore,
    shouldOverrideStore?: boolean
  ): void;
  extract: typeof extract;
  inject: typeof inject;
  telemetry: typeof telemetry;
  getAllMigrations: typeof getAllMigrations;
}
export {};
