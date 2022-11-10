/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { useDiscoverServices } from './use_discover_services';
import { showConfirmPanel } from './show_confirm_panel';
import { persistSavedSearch } from '../application/main/utils/persist_saved_search';

export const useConfirmPersistencePrompt = (
  updateAdHocDataViewId: (dataView: DataView) => Promise<DataView>
) => {
  const services = useDiscoverServices();

  const persistDataView: (dataView: DataView) => Promise<DataView> = useCallback(
    async (dataView) => {
      try {
        const updatedDataView = await updateAdHocDataViewId(dataView);

        const response = await services.dataViews.createAndSave(updatedDataView.toSpec());

        const message = i18n.translate('discover.dataViewPersist.message', {
          defaultMessage: "Saved '{dataViewName}'",
          values: { dataViewName: response.getName() },
        });
        services.toastNotifications.addSuccess(message);
        return response;
      } catch (error) {
        services.toastNotifications.addDanger({
          title: i18n.translate('discover.dataViewPersistError.title', {
            defaultMessage: 'Unable to create data view',
          }),
          text: error.message,
        });
        throw new Error(error);
      }
    },
    [services.dataViews, services.toastNotifications, updateAdHocDataViewId]
  );

  const openConfirmSavePrompt: (dataView: DataView) => Promise<DataView | undefined> = useCallback(
    async (dataView) => {
      return new Promise((resolve) =>
        showConfirmPanel({
          onConfirm: () =>
            persistDataView(dataView)
              .then((createdDataView) => resolve(createdDataView))
              .catch(() => resolve(undefined)),
          onCancel: () => resolve(undefined),
        })
      );
    },
    [persistDataView]
  );

  const onUpdateSuccess = useCallback(
    (id: string, savedSearch: SavedSearch) => {
      services.toastNotifications.addSuccess({
        title: i18n.translate('discover.notifications.updateSavedSearchTitle', {
          defaultMessage: `Search '{savedSearchTitle}' updated with saved data view`,
          values: {
            savedSearchTitle: savedSearch.title,
          },
        }),
        'data-test-subj': 'updateSearchSuccess',
      });
    },
    [services.toastNotifications]
  );

  const onUpdateError = useCallback(
    (error: Error, savedSearch: SavedSearch) => {
      services.toastNotifications.addDanger({
        title: i18n.translate('discover.notifications.notUpdatedSavedSearchTitle', {
          defaultMessage: `Search '{savedSearchTitle}' was not updated with savedDataView.`,
          values: {
            savedSearchTitle: savedSearch.title,
          },
        }),
        text: error.message,
      });
    },
    [services.toastNotifications]
  );

  const updateSavedSearch = useCallback(
    ({ savedSearch, dataView, state }) => {
      return persistSavedSearch(savedSearch, {
        dataView,
        onSuccess: (id) => onUpdateSuccess(id, savedSearch),
        onError: (error) => onUpdateError(error, savedSearch),
        state,
        saveOptions: {},
        services,
      });
    },
    [onUpdateError, onUpdateSuccess, services]
  );

  return { openConfirmSavePrompt, updateSavedSearch };
};
