/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { ISearchSource } from '@kbn/data-plugin/public';
import type { IUiSettingsClient, SavedObject, ToastsStart } from '@kbn/core/public';
export type DataViewSavedObject = SavedObject & { title: string };

interface DataViewData {
  /**
   * List of existing data views
   */
  list: DataViewSavedObject[];
  /**
   * Loaded data view (might be default data view if requested was not found)
   */
  loaded: DataView;
  /**
   * Id of the requested data view
   */
  stateVal: string;
  /**
   * Determines if requested data view was found
   */
  stateValFound: boolean;
}

export function findDataViewById(
  dataViews: DataViewSavedObject[],
  id: string
): DataViewSavedObject | undefined {
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
  dataViews: DataViewSavedObject[],
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
  dataViews: DataViewSavedObject[] = [],
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
  id: string,
  dataViews: DataViewsContract,
  config: IUiSettingsClient
): Promise<DataViewData> {
  const dataViewList = (await dataViews.getCache()) as unknown as DataViewSavedObject[];

  const actualId = getDataViewId(id, dataViewList, config.get('defaultIndex'));
  return {
    list: dataViewList || [],
    loaded: await dataViews.get(actualId),
    stateVal: id,
    stateValFound: !!id && actualId === id,
  };
}

/**
 * Function used in the discover controller to message the user about the state of the current
 * data view
 */
export function resolveDataView(
  ip: DataViewData,
  searchSource: ISearchSource,
  toastNotifications: ToastsStart
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
            ownDataViewTitle: ownDataView.title,
            ownDataViewId: ownDataView.id,
          },
        }),
      });
      return ownDataView;
    }

    toastNotifications.addWarning({
      title: warningTitle,
      text: i18n.translate('discover.showingDefaultDataViewWarningDescription', {
        defaultMessage:
          'Showing the default data view: "{loadedDataViewTitle}" ({loadedDataViewId})',
        values: {
          loadedDataViewTitle: loadedDataView.title,
          loadedDataViewId: loadedDataView.id,
        },
      }),
    });
  }

  return loadedDataView;
}
