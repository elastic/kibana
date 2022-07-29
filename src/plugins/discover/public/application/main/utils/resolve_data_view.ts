/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { DataView, DataViewListItem, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { ISearchSource } from '@kbn/data-plugin/public';
import type { SavedObject, ToastsStart } from '@kbn/core/public';
export type DataViewSavedObject = SavedObject & { title: string };

interface DataViewData {
  /**
   * List of existing data views
   */
  list: DataViewListItem[];
  /**
   * Loaded data view (might be default data view if requested was not found)
   */
  loaded: DataView | null;
  /**
   * Id of the requested data view
   */
  stateVal: string;
  /**
   * Determines if requested data view was found
   */
  stateValFound: boolean;
}

/**
 * Function to load the given data view by id, providing a fallback if it doesn't exist
 */
export async function loadDataView(
  id: string,
  dataViews: DataViewsContract
): Promise<DataViewData> {
  const dataViewList = await dataViews.getIdsWithTitle();

  let dataView: DataView | null;
  try {
    dataView = await dataViews.get(id);
  } catch (e) {
    dataView = await dataViews.getDefaultDataView();
  }

  return {
    list: dataViewList,
    loaded: dataView,
    stateVal: id,
    stateValFound: !!id && dataView?.id === id,
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

  if (!loadedDataView) {
    return;
  }

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
