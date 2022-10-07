/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useEffect, useState } from 'react';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { IToasts } from '@kbn/core-notifications-browser';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { ContextHistoryLocationState } from '../services/locator';

/**
 * Display warning on go back after adhoc data view update
 */
const showCantLoadClearedDataViewMessage = (
  toastNotifications: IToasts,
  loadedDataView: DataView,
  missedDataViewId: string
) => {
  const warningTitle = i18n.translate('discover.cantLoadAdHocDataViewAnyMore', {
    defaultMessage: "Can't load {id} any more",
    values: {
      id: `"${missedDataViewId}"`,
    },
  });

  toastNotifications.addWarning({
    title: warningTitle,
    text: i18n.translate('discover.showingLastUsedDataViewWarningDescription', {
      defaultMessage: 'Showing the last used view: "{ownDataViewTitle}" ({ownDataViewId})',
      values: {
        ownDataViewTitle: loadedDataView.title,
        ownDataViewId: loadedDataView.id,
      },
    }),
  });
};

const tryLoadDataView = async (dataViews: DataViewsContract, dataViewId: string) => {
  try {
    return await dataViews.get(dataViewId);
    // eslint-disable-next-line no-empty
  } catch (e) {}
};

export const useDataView = ({
  dataViewId,
  rowId,
  locationState,
}: {
  dataViewId: string;
  rowId: string;
  locationState: ContextHistoryLocationState;
}) => {
  const { dataViews, toastNotifications, contextLocator } = useDiscoverServices();
  const [dataView, setDataView] = useState<DataView>();
  const [error, setError] = useState<Error>();

  const resolveDataView = useCallback(async () => {
    const dataViewSpec = locationState?.dataViewSpec;

    if (dataViewSpec && dataViewSpec?.id !== dataViewId) {
      let loaded = await tryLoadDataView(dataViews, dataViewId);
      setDataView(loaded);

      // use previous data view
      if (!loaded) {
        loaded = await dataViews.create(dataViewSpec);
        showCantLoadClearedDataViewMessage(toastNotifications, loaded, dataViewId);
        contextLocator.navigate(
          {
            ...locationState,
            rowId,
            dataViewSpec: loaded.toSpec(false),
          },
          { replace: true }
        );
      }
    } else if (!dataViewSpec) {
      dataViews.get(dataViewId).then(setDataView).catch(setError);
    } else {
      dataViews.create(dataViewSpec).then(setDataView).catch(setError);
    }
  }, [contextLocator, dataViewId, dataViews, locationState, rowId, toastNotifications]);

  useEffect(() => {
    resolveDataView();
  }, [resolveDataView]);

  return { dataView, error };
};
