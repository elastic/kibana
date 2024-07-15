/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { DataView, DataViewListItem, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { ToastsStart } from '@kbn/core/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DiscoverInternalStateContainer } from '../discover_internal_state_container';
import { DiscoverServices } from '../../../../build_services';
interface DataViewData {
  /**
   * List of existing data views
   */
  list: DataViewListItem[];
  /**
   * Loaded data view (might be default data view if requested was not found)
   */
  loaded: DataView;
  /**
   * Id of the requested data view
   */
  stateVal?: string;
  /**
   * Determines if requested data view was found
   */
  stateValFound: boolean;
}

/**
 * Function to load the given data view by id, providing a fallback if it doesn't exist
 */
export async function loadDataView({
  id,
  dataViewSpec,
  services,
  dataViewList,
}: {
  id?: string;
  dataViewSpec?: DataViewSpec;
  services: DiscoverServices;
  dataViewList: DataViewListItem[];
}): Promise<DataViewData> {
  const { dataViews } = services;

  let fetchId: string | undefined = id;

  /**
   * Handle redirect with data view spec provided via history location state
   */
  if (dataViewSpec) {
    const isPersisted = dataViewList.find(({ id: currentId }) => currentId === dataViewSpec.id);
    if (!isPersisted) {
      const createdAdHocDataView = await dataViews.create(dataViewSpec);
      return {
        list: dataViewList || [],
        loaded: createdAdHocDataView,
        stateVal: createdAdHocDataView.id,
        stateValFound: true,
      };
    }
    // reassign fetchId in case of persisted data view spec provided
    fetchId = dataViewSpec.id!;
  }

  let fetchedDataView: DataView | null = null;
  // try to fetch adhoc data view first
  try {
    fetchedDataView = fetchId ? await dataViews.get(fetchId) : null;
    if (fetchedDataView && !fetchedDataView.isPersisted()) {
      return {
        list: dataViewList || [],
        loaded: fetchedDataView,
        stateVal: id,
        stateValFound: true,
      };
    }
    // Skipping error handling, since 'get' call trying to fetch
    // adhoc data view which only created using Promise.resolve(dataView),
    // Any other error will be handled by the next 'get' call below.
    // eslint-disable-next-line no-empty
  } catch (e) {}

  let defaultDataView: DataView | null = null;
  if (!fetchedDataView) {
    try {
      defaultDataView = await dataViews.getDefaultDataView({
        displayErrors: true, // notify the user about access issues
        refreshFields: true,
      });
    } catch (e) {
      //
    }
  }

  // fetch persisted data view
  return {
    list: dataViewList || [],
    // we can be certain that the data view exists due to an earlier hasData check
    loaded: fetchedDataView || defaultDataView!,
    stateVal: fetchId,
    stateValFound: Boolean(fetchId) && Boolean(fetchedDataView),
  };
}

/**
 * Check if the given data view is valid, provide a fallback if it doesn't exist
 * And message the user in this case with toast notifications
 */
export function resolveDataView(
  ip: DataViewData,
  savedSearch: SavedSearch | undefined,
  toastNotifications: ToastsStart,
  isEsqlMode?: boolean
) {
  const { loaded: loadedDataView, stateVal, stateValFound } = ip;

  const ownDataView = savedSearch?.searchSource.getField('index');

  if (ownDataView && !stateVal) {
    // the given saved search has its own data view, and no data view was specified in the URL
    return ownDataView;
  }

  // no warnings for ES|QL mode
  if (stateVal && !stateValFound && !Boolean(isEsqlMode)) {
    const warningTitle = i18n.translate('discover.valueIsNotConfiguredDataViewIDWarningTitle', {
      defaultMessage: '{stateVal} is not a configured data view ID',
      values: {
        stateVal: `"${stateVal}"`,
      },
    });

    if (ownDataView) {
      // the given data view in the URL was not found, but the saved search has its own data view
      toastNotifications.addWarning({
        title: warningTitle,
        text: i18n.translate('discover.showingSavedDataViewWarningDescription', {
          defaultMessage: 'Showing the saved data view: "{ownDataViewTitle}" ({ownDataViewId})',
          values: {
            ownDataViewTitle: ownDataView.getIndexPattern(),
            ownDataViewId: ownDataView.id,
          },
        }),
        'data-test-subj': 'dscDataViewNotFoundShowSavedWarning',
      });
      return ownDataView;
    }
    toastNotifications.addWarning({
      title: warningTitle,
      text: i18n.translate('discover.showingDefaultDataViewWarningDescription', {
        defaultMessage:
          'Showing the default data view: "{loadedDataViewTitle}" ({loadedDataViewId})',
        values: {
          loadedDataViewTitle: loadedDataView.getIndexPattern(),
          loadedDataViewId: loadedDataView.id,
        },
      }),
      'data-test-subj': 'dscDataViewNotFoundShowDefaultWarning',
    });
  }

  return loadedDataView;
}

export const loadAndResolveDataView = async (
  {
    id,
    dataViewSpec,
    savedSearch,
    isEsqlMode,
  }: {
    id?: string;
    dataViewSpec?: DataViewSpec;
    savedSearch?: SavedSearch;
    isEsqlMode?: boolean;
  },
  {
    internalStateContainer,
    services,
  }: { internalStateContainer: DiscoverInternalStateContainer; services: DiscoverServices }
) => {
  const { adHocDataViews, savedDataViews } = internalStateContainer.getState();
  const adHocDataView = adHocDataViews.find((dataView) => dataView.id === id);
  if (adHocDataView) return { fallback: false, dataView: adHocDataView };

  const nextDataViewData = await loadDataView({
    services,
    id,
    dataViewSpec,
    dataViewList: savedDataViews,
  });
  const nextDataView = resolveDataView(
    nextDataViewData,
    savedSearch,
    services.toastNotifications,
    isEsqlMode
  );
  return { fallback: !nextDataViewData.stateValFound, dataView: nextDataView };
};
