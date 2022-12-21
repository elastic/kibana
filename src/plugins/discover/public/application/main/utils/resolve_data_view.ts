/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type {
  DataView,
  DataViewListItem,
  DataViewsContract,
  DataViewSpec,
} from '@kbn/data-views-plugin/public';
import type { ISearchSource } from '@kbn/data-plugin/public';
import type { IUiSettingsClient, ToastsStart } from '@kbn/core/public';
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
  dataViews: DataViewsContract,
  config: IUiSettingsClient,
  id?: string,
  dataViewSpec?: DataViewSpec
): Promise<DataViewData> {
  const dataViewList = await dataViews.getIdsWithTitle();
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

  // try to fetch adhoc data view first
  try {
    const fetchedDataView = fetchId ? await dataViews.get(fetchId) : undefined;
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

  // fetch persisted data view
  const actualId = getDataViewId(fetchId, dataViewList, config.get('defaultIndex'));
  return {
    list: dataViewList || [],
    loaded: await dataViews.get(actualId),
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
  searchSource: ISearchSource,
  toastNotifications: ToastsStart,
  isTextBasedQuery?: boolean
) {
  const { loaded: loadedDataView, stateVal, stateValFound } = ip;

  const ownDataView = searchSource.getOwnField('index');

  if (ownDataView && !stateVal) {
    return ownDataView;
  }

  if (stateVal && !stateValFound) {
    const warningTitle = i18n.translate('discover.valueIsNotConfiguredDataViewIDWarningTitle', {
      defaultMessage: '{stateVal} is not a configured data view ID',
      values: {
        stateVal: `"${stateVal}"`,
      },
    });

    if (ownDataView) {
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
    if (!Boolean(isTextBasedQuery)) {
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
  }

  return loadedDataView;
}
