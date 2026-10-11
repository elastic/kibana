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
import type { DiscoverServices } from '../../../../build_services';
import type { RuntimeStateManager } from '../redux';
import { isInlineDataViewSpec } from '../../../../../common/session/inline_data_view';
import {
  getNavigationDataView,
  getRequestedDataView,
} from '../../../../../common/session/initial_data_view';

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

/** Loads a supplied spec or a view by ID, using a fallback when the requested ID cannot be loaded. */
export async function loadDataView({
  dataViewId,
  locationDataViewSpec,
  initialAdHocDataViewSpec,
  services: { dataViews, inlineDataViews },
  savedDataViews,
  adHocDataViews,
}: {
  dataViewId?: string;
  locationDataViewSpec?: DataViewSpec;
  /** Restored inline specs and their tab references must already be normalized together. */
  initialAdHocDataViewSpec?: DataViewSpec;
  services: DiscoverServices;
  savedDataViews: DataViewListItem[];
  adHocDataViews: DataView[];
}): Promise<DataViewData> {
  const navigationDataView = getNavigationDataView(
    locationDataViewSpec,
    savedDataViews.map(({ id }) => id)
  );
  const requested = getRequestedDataView({
    dataViewId,
    navigationDataView,
    restoredDataViewSpec: initialAdHocDataViewSpec,
  });

  if (typeof requested === 'object') {
    const isExcludedNavigationView =
      requested === navigationDataView && !isInlineDataViewSpec(requested);

    // Only excluded navigation views retain their historical replacement behavior.
    if (isExcludedNavigationView && requested.id) {
      dataViews.clearInstanceCache(requested.id);
    }

    const createdAdHocDataView = await inlineDataViews.resolve(requested);

    return {
      loadedDataView: createdAdHocDataView,
      requestedDataViewId: createdAdHocDataView.id,
      requestedDataViewFound: true,
    };
  }

  const fetchId = requested;

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

/** Selects the loaded or current view and warns when the requested ID was not found. */
function resolveDataView({
  dataViewData,
  currentDataView,
  toastNotifications,
  isEsqlMode,
}: {
  dataViewData: DataViewData;
  currentDataView: DataView | undefined;
  toastNotifications: ToastsStart;
  isEsqlMode?: boolean;
}) {
  const { loadedDataView, requestedDataViewId, requestedDataViewFound } = dataViewData;

  if (currentDataView && !requestedDataViewId) {
    // the current data view exists, and no data view was specified in the URL
    return currentDataView;
  }

  // no warnings for ES|QL mode
  if (requestedDataViewId && !requestedDataViewFound && !Boolean(isEsqlMode)) {
    const warningTitle = i18n.translate('discover.valueIsNotConfiguredDataViewIDWarningTitle', {
      defaultMessage: '{stateVal} is not a configured data view ID',
      values: {
        stateVal: `"${requestedDataViewId}"`,
      },
    });

    if (currentDataView) {
      // the given data view in the URL was not found, but a current data view exists
      toastNotifications.addWarning({
        title: warningTitle,
        text: i18n.translate('discover.showingSavedDataViewWarningDescription', {
          defaultMessage: 'Showing the saved data view: "{ownDataViewTitle}" ({ownDataViewId})',
          values: {
            ownDataViewTitle: currentDataView.getIndexPattern(),
            ownDataViewId: currentDataView.id,
          },
        }),
        'data-test-subj': 'dscDataViewNotFoundShowSavedWarning',
      });

      return currentDataView;
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

/** Reuses or loads a view, applies fallback selection, and fetches missing inline fields. */
export const loadAndResolveDataView = async ({
  dataViewId,
  locationDataViewSpec,
  initialAdHocDataViewSpec,
  currentDataView,
  isEsqlMode,
  savedDataViews,
  runtimeStateManager,
  services,
}: {
  dataViewId?: string;
  locationDataViewSpec?: DataViewSpec;
  initialAdHocDataViewSpec?: DataViewSpec;
  currentDataView?: DataView;
  isEsqlMode?: boolean;
  savedDataViews: DataViewListItem[];
  runtimeStateManager: RuntimeStateManager;
  services: DiscoverServices;
}) => {
  const { dataViews, toastNotifications } = services;
  const adHocDataViews = runtimeStateManager.adHocDataViews$.getValue();

  // Check ad hoc data views first, unless a data view spec is supplied,
  // then attempt to load one if none is found
  let fallback = false;
  let dataView = locationDataViewSpec
    ? undefined
    : adHocDataViews.find((dv) => dv.id === dataViewId);

  if (!dataView) {
    const dataViewData = await loadDataView({
      dataViewId,
      locationDataViewSpec,
      initialAdHocDataViewSpec,
      services,
      savedDataViews,
      adHocDataViews,
    });

    fallback = !dataViewData.requestedDataViewFound;
    dataView = resolveDataView({
      dataViewData,
      currentDataView,
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
