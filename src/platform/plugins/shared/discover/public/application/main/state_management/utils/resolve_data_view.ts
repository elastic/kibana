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
import type { AggregateQuery, Query } from '@kbn/es-query';
import { getEsqlDataView } from '@kbn/discover-utils';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { isEqual } from 'lodash';
import type { DiscoverServices } from '../../../../build_services';
import type { RuntimeStateManager } from '../redux';

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
  locationDataViewSpec,
  initialAdHocDataViewSpec,
  services: { dataViews },
  savedDataViews,
  adHocDataViews,
}: {
  dataViewId?: string;
  locationDataViewSpec?: DataViewSpec;
  initialAdHocDataViewSpec?: DataViewSpec;
  services: DiscoverServices;
  savedDataViews: DataViewListItem[];
  adHocDataViews: DataView[];
}): Promise<DataViewData> {
  let fetchId: string | undefined = dataViewId;

  // Handle redirect with data view spec provided via history location state
  if (locationDataViewSpec) {
    const isPersisted = savedDataViews.find(
      ({ id: currentId }) => currentId === locationDataViewSpec.id
    );
    if (isPersisted) {
      // If passed a spec for a persisted data view, reassign the fetchId
      fetchId = locationDataViewSpec.id!;
    } else {
      // If passed an ad hoc data view spec, clear the instance cache
      // to avoid conflicts, then create and return the data view
      if (locationDataViewSpec.id) {
        dataViews.clearInstanceCache(locationDataViewSpec.id);
      }
      const createdAdHocDataView = await dataViews.create(locationDataViewSpec);
      return {
        loadedDataView: createdAdHocDataView,
        requestedDataViewId: createdAdHocDataView.id,
        requestedDataViewFound: true,
      };
    }
  }

  // If the initial ad hoc data view spec matches the data view id, create and return it
  if (dataViewId && initialAdHocDataViewSpec?.id === dataViewId) {
    const createdAdHocDataView = await dataViews.create(initialAdHocDataViewSpec);
    return {
      loadedDataView: createdAdHocDataView,
      requestedDataViewId: createdAdHocDataView.id,
      requestedDataViewFound: true,
    };
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

export interface LocalTabDataViewState {
  query: Query | AggregateQuery | undefined;
  spec: DataViewSpec | undefined;
}

/** Resolves the Data View needed to start an ES|QL tab. */
export async function resolveInitialEsqlDataView({
  query,
  localTabState,
  currentDataView,
  services,
}: {
  query: AggregateQuery;
  localTabState: LocalTabDataViewState | undefined;
  currentDataView: DataView | undefined;
  services: Pick<DiscoverServices, 'dataViews' | 'http'>;
}): Promise<{ dataView: DataView; refreshFields?: () => void }> {
  const localSpec = localTabState?.spec;
  if (
    !localTabState ||
    !localSpec?.id ||
    !isEqual(localTabState.query, query) ||
    localSpec.title !== getIndexPatternFromESQLQuery(query.esql)
  ) {
    return { dataView: await getEsqlDataView(query, currentDataView, services) };
  }

  // ES|QL Data Views are tab-owned. Do not reuse a mutable instance from another tab.
  services.dataViews.clearInstanceCache(localSpec.id);

  const dataView = await services.dataViews.create(
    {
      ...localSpec,
      // Tab state normally has no fields; also ignore stale fields from older stored state.
      fields: undefined,
    },
    true
  );

  return {
    dataView,
    refreshFields: () => {
      // A failed background refresh must not replace the usable restored Data View.
      const displayErrors = false;
      void services.dataViews.refreshFields(dataView, displayErrors).catch(() => {});
    },
  };
}
