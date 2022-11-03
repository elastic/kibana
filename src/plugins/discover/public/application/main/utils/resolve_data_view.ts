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
import { DiscoverServices } from '../../../build_services';
interface DataViewData {
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

export function findDataViewById(
  dataViews: DataViewListItem[],
  id: string
): DataViewListItem | undefined {
  if (!Array.isArray(dataViews) || !id) {
    return;
  }
  return dataViews.find((o) => o.id === id);
}

/**
 * Checks if the given defaultIndex exists and returns
 * the first available data view id if not
 */
export function getFallbackDataViewId(
  dataViews: DataViewListItem[],
  defaultIndex: string = ''
): string {
  if (defaultIndex && findDataViewById(dataViews, defaultIndex)) {
    return defaultIndex;
  }
  return dataViews && dataViews[0]?.id ? dataViews[0].id : '';
}

/**
 * A given data view id is checked for existence and a fallback is provided if it doesn't exist
 * The provided defaultIndex is usually configured in Advanced Settings, if it's also invalid
 * the first entry of the given list of dataViews is used
 */
export function getDataViewId(
  id: string = '',
  dataViews: DataViewListItem[] = [],
  defaultIndex: string = ''
): string {
  if (!id || !findDataViewById(dataViews, id)) {
    return getFallbackDataViewId(dataViews, defaultIndex);
  }
  return id;
}

/**
 * Function to load the given data view by id, providing a fallback if it doesn't exist
 */
export async function loadDataView(
  dataViewList: DataViewListItem[],
  services: DiscoverServices,
  id?: string,
  dataViewSpec?: DataViewSpec
): Promise<DataViewData> {
  let fetchId: string | undefined = id;

  /**
   * Handle redirect with data view spec provided via history location state
   */
  if (dataViewSpec) {
    const isPersisted = dataViewList.find(({ id: currentId }) => currentId === dataViewSpec.id);
    if (!isPersisted) {
      const createdAdHocDataView = await services.dataViews.create(dataViewSpec);
      return {
        loaded: createdAdHocDataView,
        stateVal: createdAdHocDataView.id,
        stateValFound: true,
      };
    }
    // reassign fetchId in case of persisted data view spec provided
    fetchId = dataViewSpec.id!;
  }

  // try to fetch adhoc data view first
  try {
    const fetchedDataView = fetchId ? await services.dataViews.get(fetchId) : undefined;
    if (fetchedDataView && !fetchedDataView.isPersisted()) {
      return {
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

  // fetch persisted data view
  const actualId = getDataViewId(fetchId, dataViewList, services.uiSettings.get('defaultIndex'));
  const loaded = await services.dataViews.get(actualId);
  return {
    loaded,
    stateVal: fetchId,
    stateValFound: !!fetchId && actualId === fetchId,
  };
}

/**
 * Function used in the discover controller to message the user about the state of the current
 * data view
 */
export function resolveDataView(
  ip: DataViewData,
  savedSearchDataView: DataView | undefined,
  toastNotifications: ToastsStart
) {
  const { loaded: loadedDataView, stateVal, stateValFound } = ip;

  if (savedSearchDataView && !stateVal) {
    return savedSearchDataView;
  }

  if (stateVal && !stateValFound) {
    const warningTitle = i18n.translate('discover.valueIsNotConfiguredDataViewIDWarningTitle', {
      defaultMessage: '{stateVal} is not a configured data view ID',
      values: {
        stateVal: `"${stateVal}"`,
      },
    });

    if (savedSearchDataView) {
      toastNotifications.addWarning({
        title: warningTitle,
        text: i18n.translate('discover.showingSavedDataViewWarningDescription', {
          defaultMessage: 'Showing the saved data view: "{ownDataViewTitle}" ({ownDataViewId})',
          values: {
            ownDataViewTitle: savedSearchDataView.getIndexPattern(),
            ownDataViewId: savedSearchDataView.id,
          },
        }),
        'data-test-subj': 'dscDataViewNotFoundShowSavedWarning',
      });
      return savedSearchDataView;
    }
    if (loadedDataView) {
      toastNotifications.addWarning({
        title: warningTitle,
        text: i18n.translate('discover.showingDefaultDataViewWarningDescription', {
          defaultMessage:
            'Showing the default data view: "{loadedDataViewTitle}" ({loadedDataViewId})',
          values: {
            loadedDataViewTitle: loadedDataView?.getIndexPattern(),
            loadedDataViewId: loadedDataView?.id,
          },
        }),
        'data-test-subj': 'dscDataViewNotFoundShowDefaultWarning',
      });
    }
  }

  return loadedDataView;
}
