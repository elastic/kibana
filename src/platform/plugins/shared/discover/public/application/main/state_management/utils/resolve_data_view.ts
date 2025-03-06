/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { DataView, DataViewListItem, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { ToastsStart } from '@kbn/core/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DiscoverInternalStateContainer } from '../discover_internal_state_container';
import { DiscoverServices } from '../../../../build_services';

interface DataViewData {
  /**
   * Loaded data view (might be default data view if requested was not found)
   */
  loadedDataView: DataView;
  /**
   * Id of the requested data view
   */
  requestedDataViewId?: string;
  /**
   * Determines if requested data view was found
   */
  requestedDataViewFound: boolean;
}

/**
 * Function to load the given data view by id, providing a fallback if it doesn't exist
 */
export async function loadDataView({
  dataViewId,
  dataViewSpec,
  services: { dataViews },
  savedDataViews,
  adHocDataViews,
}: {
  dataViewId?: string;
  dataViewSpec?: DataViewSpec;
  services: DiscoverServices;
  savedDataViews: DataViewListItem[];
  adHocDataViews: DataView[];
}): Promise<DataViewData> {
  let fetchId: string | undefined = dataViewId;

  // Handle redirect with data view spec provided via history location state
  if (dataViewSpec) {
    const isPersisted = savedDataViews.find(({ id: currentId }) => currentId === dataViewSpec.id);
    if (isPersisted) {
      // If passed a spec for a persisted data view, reassign the fetchId
      fetchId = dataViewSpec.id!;
    } else {
      // If passed an ad hoc data view spec, clear the instance cache
      // to avoid conflicts, then create and return the data view
      if (dataViewSpec.id) {
        dataViews.clearInstanceCache(dataViewSpec.id);
      }
      const createdAdHocDataView = await dataViews.create(dataViewSpec);
      return {
        loadedDataView: createdAdHocDataView,
        requestedDataViewId: createdAdHocDataView.id,
        requestedDataViewFound: true,
      };
    }
  }

  // First try to fetch the data view by ID
  let fetchedDataView: DataView | null = null;
  try {
    fetchedDataView = fetchId ? await dataViews.get(fetchId) : null;
  } catch (e) {
    // Swallow the error and fall back to the default data view
  }

  // If there is no fetched data view, try to fetch the default data view
  let defaultDataView: DataView | null = null;
  if (!fetchedDataView) {
    try {
      defaultDataView = await dataViews.getDefaultDataView({
        displayErrors: true, // notify the user about access issues
        refreshFields: true,
      });
    } catch (e) {
      // Swallow the error and fall back to the first ad hoc data view
    }
  }

  // If nothing else is available, use the first ad hoc data view as a fallback
  let defaultAdHocDataView: DataView | null = null;
  if (!fetchedDataView && !defaultDataView && adHocDataViews.length) {
    defaultAdHocDataView = adHocDataViews[0];
  }

  return {
    // We can be certain that a data view exists due to an earlier hasData check
    loadedDataView: (fetchedDataView || defaultDataView || defaultAdHocDataView)!,
    requestedDataViewId: fetchId,
    requestedDataViewFound: Boolean(fetchId) && Boolean(fetchedDataView),
  };
}

/**
 * Check if the given data view is valid, provide a fallback if it doesn't exist
 * And message the user in this case with toast notifications
 */
function resolveDataView({
  dataViewData,
  savedSearch,
  toastNotifications,
  isEsqlMode,
}: {
  dataViewData: DataViewData;
  savedSearch: SavedSearch | undefined;
  toastNotifications: ToastsStart;
  isEsqlMode?: boolean;
}) {
  const { loadedDataView, requestedDataViewId, requestedDataViewFound } = dataViewData;
  const ownDataView = savedSearch?.searchSource.getField('index');

  if (ownDataView && !requestedDataViewId) {
    // the given saved search has its own data view, and no data view was specified in the URL
    return ownDataView;
  }

  // no warnings for ES|QL mode
  if (requestedDataViewId && !requestedDataViewFound && !Boolean(isEsqlMode)) {
    const warningTitle = i18n.translate('discover.valueIsNotConfiguredDataViewIDWarningTitle', {
      defaultMessage: '{stateVal} is not a configured data view ID',
      values: {
        stateVal: `"${requestedDataViewId}"`,
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

export const loadAndResolveDataView = async ({
  dataViewId,
  dataViewSpec,
  savedSearch,
  isEsqlMode,
  internalStateContainer,
  services,
}: {
  dataViewId?: string;
  dataViewSpec?: DataViewSpec;
  savedSearch?: SavedSearch;
  isEsqlMode?: boolean;
  internalStateContainer: DiscoverInternalStateContainer;
  services: DiscoverServices;
}) => {
  const { dataViews, toastNotifications } = services;
  const { adHocDataViews, savedDataViews } = internalStateContainer.getState();

  // Check ad hoc data views first, unless a data view spec is supplied,
  // then attempt to load one if none is found
  let fallback = false;
  let dataView = dataViewSpec ? undefined : adHocDataViews.find((dv) => dv.id === dataViewId);

  if (!dataView) {
    const dataViewData = await loadDataView({
      dataViewId,
      services,
      dataViewSpec,
      savedDataViews,
      adHocDataViews,
    });

    fallback = !dataViewData.requestedDataViewFound;
    dataView = resolveDataView({
      dataViewData,
      savedSearch,
      toastNotifications,
      isEsqlMode,
    });
  }

  // If dataView is an ad hoc data view with no fields, refresh its field list.
  // This can happen when default profile data views are created without fields
  // to avoid unnecessary requests on startup.
  if (!dataView.isPersisted() && !dataView.fields.length) {
    await dataViews.refreshFields(dataView);
  }

  return { fallback, dataView };
};
