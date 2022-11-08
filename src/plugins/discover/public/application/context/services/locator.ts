/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter } from '@kbn/es-query';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
export const DISCOVER_CONTEXT_APP_LOCATOR = 'DISCOVER_CONTEXT_APP_LOCATOR';

export interface DiscoverContextAppLocatorParams extends SerializableRecord {
  index: string | DataViewSpec; // spec in case of adhoc data view
  rowId: string;
  columns?: string[];
  filters?: Filter[];
  referrer: string; // discover main view url
}

export type DiscoverContextAppLocator = LocatorPublic<DiscoverContextAppLocatorParams>;

export interface DiscoverContextAppLocatorDependencies {
  useHash: boolean;
}

export interface ContextHistoryLocationState {
  referrer: string;
  dataViewSpec?: DataViewSpec;
}

export class DiscoverContextAppLocatorDefinition
  implements LocatorDefinition<DiscoverContextAppLocatorParams>
{
  public readonly id = DISCOVER_CONTEXT_APP_LOCATOR;

  constructor(protected readonly deps: DiscoverContextAppLocatorDependencies) {}

  public readonly getLocation = async (params: DiscoverContextAppLocatorParams) => {
    const useHash = this.deps.useHash;
    const { index, rowId, columns, filters, referrer } = params;

    const appState: { filters?: Filter[]; columns?: string[] } = {};
    const queryState: GlobalQueryStateFromUrl = {};

    const { isFilterPinned } = await import('@kbn/es-query');
    if (filters && filters.length) appState.filters = filters?.filter((f) => !isFilterPinned(f));
    if (columns) appState.columns = columns;

    if (filters && filters.length) queryState.filters = filters?.filter((f) => isFilterPinned(f));

    let dataViewId;
    const state: ContextHistoryLocationState = { referrer };
    if (typeof index === 'object') {
      state.dataViewSpec = index;
      dataViewId = index.id!;
    } else {
      dataViewId = index;
    }

    let path = `#/context/${dataViewId}/${rowId}`;
    path = setStateToKbnUrl<GlobalQueryStateFromUrl>('_g', queryState, { useHash }, path);
    path = setStateToKbnUrl('_a', appState, { useHash }, path);

    return {
      app: 'discover',
      path,
      state,
    };
  };
}
