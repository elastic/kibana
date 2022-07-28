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
export type IndexPatternSavedObject = SavedObject & { title: string };

interface DataViewData {
  /**
   * List of existing data views
   */
  list: DataViewListItem[];
  /**
   * Loaded index pattern (might be default index pattern if requested was not found)
   */
  loaded: DataView | null;
  /**
   * Id of the requested index pattern
   */
  stateVal: string;
  /**
   * Determines if requested index pattern was found
   */
  stateValFound: boolean;
}

/**
 * Function to load the given index pattern by id, providing a fallback if it doesn't exist
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
 * index pattern
 */
export function resolveDataView(
  ip: DataViewData,
  searchSource: ISearchSource,
  toastNotifications: ToastsStart
) {
  const { loaded: loadedIndexPattern, stateVal, stateValFound } = ip;

  const ownIndexPattern = searchSource.getOwnField('index');
  if (!loadedIndexPattern) {
    return;
  }

  if (ownIndexPattern && !stateVal) {
    return ownIndexPattern;
  }

  if (stateVal && !stateValFound) {
    const warningTitle = i18n.translate('discover.valueIsNotConfiguredDataViewIDWarningTitle', {
      defaultMessage: '{stateVal} is not a configured data view ID',
      values: {
        stateVal: `"${stateVal}"`,
      },
    });

    if (ownIndexPattern) {
      toastNotifications.addWarning({
        title: warningTitle,
        text: i18n.translate('discover.showingSavedDataViewWarningDescription', {
          defaultMessage:
            'Showing the saved data view: "{ownIndexPatternTitle}" ({ownIndexPatternId})',
          values: {
            ownIndexPatternTitle: ownIndexPattern.title,
            ownIndexPatternId: ownIndexPattern.id,
          },
        }),
      });
      return ownIndexPattern;
    }

    toastNotifications.addWarning({
      title: warningTitle,
      text: i18n.translate('discover.showingDefaultDataViewWarningDescription', {
        defaultMessage:
          'Showing the default data view: "{loadedIndexPatternTitle}" ({loadedIndexPatternId})',
        values: {
          loadedIndexPatternTitle: loadedIndexPattern.title,
          loadedIndexPatternId: loadedIndexPattern.id,
        },
      }),
    });
  }
  return loadedIndexPattern;
}
