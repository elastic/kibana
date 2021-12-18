/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { Subject } from 'rxjs';

import { IUiSettingsClient } from 'src/core/public';

import { isFilterPinned, onlyDisabledFiltersChanged, Filter } from '@kbn/es-query';
import { sortFilters } from './lib/sort_filters';
import { mapAndFlattenFilters } from './lib/map_and_flatten_filters';

import {
  FilterStateStore,
  uniqFilters,
  compareFilters,
  COMPARE_ALL_OPTIONS,
  UI_SETTINGS,
} from '../../../common';
import { PersistableStateService } from '../../../../kibana_utils/common/persistable_state';
import {
  getAllMigrations,
  inject,
  extract,
  telemetry,
} from '../../../common/query/persistable_state';

interface PartitionedFilters {
  globalFilters: Filter[];
  appFilters: Filter[];
}

export class FilterManager implements PersistableStateService<Filter[]> {
  private filters: Filter[] = [];
  private updated$: Subject<void> = new Subject();
  private fetch$: Subject<void> = new Subject();
  private uiSettings: IUiSettingsClient;

  constructor(uiSettings: IUiSettingsClient) {
    this.uiSettings = uiSettings;
  }

  private mergeIncomingFilters(partitionedFilters: PartitionedFilters): Filter[] {
    const globalFilters = partitionedFilters.globalFilters;
    const appFilters = partitionedFilters.appFilters;

    // existing globalFilters should be mutated by appFilters
    // ignore original appFilters which are already inside globalFilters
    const cleanedAppFilters: Filter[] = [];
    _.each(appFilters, function (filter, i) {
      const match = _.find(globalFilters, function (globalFilter) {
        return compareFilters(globalFilter, filter);
      });

      // no match, do continue with app filter
      if (!match) {
        return cleanedAppFilters.push(filter);
      }

      // matching filter in globalState, update global and don't add from appState
      _.assignIn(match.meta, filter.meta);
    });

    return FilterManager.mergeFilters(cleanedAppFilters, globalFilters);
  }

  private static mergeFilters(appFilters: Filter[], globalFilters: Filter[]): Filter[] {
    return uniqFilters(appFilters.reverse().concat(globalFilters.reverse())).reverse();
  }

  private static partitionFilters(filters: Filter[]): PartitionedFilters {
    const [globalFilters, appFilters] = _.partition(filters, isFilterPinned);
    return {
      globalFilters,
      appFilters,
    };
  }

  private handleStateUpdate(newFilters: Filter[]) {
    newFilters.sort(sortFilters);

    const filtersUpdated = !compareFilters(this.filters, newFilters, COMPARE_ALL_OPTIONS);
    const updatedOnlyDisabledFilters = onlyDisabledFiltersChanged(newFilters, this.filters);

    this.filters = newFilters;
    if (filtersUpdated) {
      this.updated$.next();
      if (!updatedOnlyDisabledFilters) {
        this.fetch$.next();
      }
    }
  }

  /* Getters */

  public getFilters() {
    return _.cloneDeep(this.filters);
  }

  public getAppFilters() {
    const { appFilters } = this.getPartitionedFilters();
    return appFilters;
  }

  public getGlobalFilters() {
    const { globalFilters } = this.getPartitionedFilters();
    return globalFilters;
  }

  public getPartitionedFilters(): PartitionedFilters {
    return FilterManager.partitionFilters(this.getFilters());
  }

  public getUpdates$() {
    return this.updated$.asObservable();
  }

  public getFetches$() {
    return this.fetch$.asObservable();
  }

  /* Setters */

  public addFilters(
    filters: Filter[] | Filter,
    pinFilterStatus: boolean = this.uiSettings.get(UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT)
  ) {
    if (!Array.isArray(filters)) {
      filters = [filters];
    }

    if (filters.length === 0) {
      return;
    }

    const store = pinFilterStatus ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE;

    FilterManager.setFiltersStore(filters, store);

    const mappedFilters = mapAndFlattenFilters(filters);

    // This is where we add new filters to the correct place (app \ global)
    const newPartitionedFilters = FilterManager.partitionFilters(mappedFilters);
    const currentFilters = this.getPartitionedFilters();
    currentFilters.appFilters.push(...newPartitionedFilters.appFilters);
    currentFilters.globalFilters.push(...newPartitionedFilters.globalFilters);

    const newFilters = this.mergeIncomingFilters(currentFilters);
    this.handleStateUpdate(newFilters);
  }

  public setFilters(
    newFilters: Filter[],
    pinFilterStatus: boolean = this.uiSettings.get(UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT)
  ) {
    const store = pinFilterStatus ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE;

    FilterManager.setFiltersStore(newFilters, store);

    const mappedFilters = mapAndFlattenFilters(newFilters);
    const newPartitionedFilters = FilterManager.partitionFilters(mappedFilters);
    const mergedFilters = this.mergeIncomingFilters(newPartitionedFilters);
    this.handleStateUpdate(mergedFilters);
  }

  /**
   * Sets new global filters and leaves app filters untouched,
   * Removes app filters for which there is a duplicate within new global filters
   * @param newGlobalFilters
   */
  public setGlobalFilters(newGlobalFilters: Filter[]) {
    newGlobalFilters = mapAndFlattenFilters(newGlobalFilters);
    FilterManager.setFiltersStore(newGlobalFilters, FilterStateStore.GLOBAL_STATE, true);
    const { appFilters } = this.getPartitionedFilters();
    const newFilters = this.mergeIncomingFilters({
      appFilters,
      globalFilters: newGlobalFilters,
    });

    this.handleStateUpdate(newFilters);
  }

  /**
   * Sets new app filters and leaves global filters untouched,
   * Removes app filters for which there is a duplicate within new global filters
   * @param newAppFilters
   */
  public setAppFilters(newAppFilters: Filter[]) {
    newAppFilters = mapAndFlattenFilters(newAppFilters);
    FilterManager.setFiltersStore(newAppFilters, FilterStateStore.APP_STATE, true);
    const { globalFilters } = this.getPartitionedFilters();
    const newFilters = this.mergeIncomingFilters({
      globalFilters,
      appFilters: newAppFilters,
    });
    this.handleStateUpdate(newFilters);
  }

  public removeFilter(filter: Filter) {
    const filterIndex = _.findIndex(this.filters, (item) => {
      return _.isEqual(item.meta, filter.meta) && _.isEqual(item.query, filter.query);
    });

    if (filterIndex >= 0) {
      const newFilters = _.cloneDeep(this.filters);
      newFilters.splice(filterIndex, 1);
      this.handleStateUpdate(newFilters);
    }
  }

  public removeAll() {
    this.setFilters([]);
  }

  public static setFiltersStore(
    filters: Filter[],
    store: FilterStateStore,
    shouldOverrideStore = false
  ) {
    _.map(filters, (filter: Filter) => {
      // Override status only for filters that didn't have state in the first place.
      // or if shouldOverrideStore is explicitly true
      if (shouldOverrideStore || filter.$state === undefined) {
        filter.$state = { store };
      }
    });
  }

  public extract = extract;

  public inject = inject;

  public telemetry = telemetry;

  public getAllMigrations = getAllMigrations;
}
