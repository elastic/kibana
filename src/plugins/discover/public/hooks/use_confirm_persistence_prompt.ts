/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import uuid from 'uuid/v4';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { useDiscoverServices } from './use_discover_services';
import { showConfirmPanel } from './show_confirm_panel';
import { persistSavedSearch } from '../application/main/utils/persist_saved_search';
import { DiscoverStateContainer } from '../application/main/services/discover_state';
import { updateFiltersReferences } from '../application/main/utils/update_filter_references';

export const useConfirmPersistencePrompt = (stateContainer: DiscoverStateContainer) => {
  const services = useDiscoverServices();

  const persistDataView: (adHocDataView: DataView) => Promise<DataView> = useCallback(
    async (adHocDataView) => {
      try {
        const persistedDataView = await services.dataViews.createAndSave({
          ...adHocDataView.toSpec(),
          id: uuid(),
        });
        services.dataViews.clearInstanceCache(adHocDataView.id);

        updateFiltersReferences(adHocDataView, persistedDataView);

        stateContainer.actions.removeAdHocDataViewById(adHocDataView.id!);
        await stateContainer.replaceUrlAppState({ index: persistedDataView.id });

        const message = i18n.translate('discover.dataViewPersist.message', {
          defaultMessage: "Saved '{dataViewName}'",
          values: { dataViewName: persistedDataView.getName() },
        });
        services.toastNotifications.addSuccess(message);
        return persistedDataView;
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
    [services.dataViews, services.toastNotifications, stateContainer]
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
    (savedSearch: SavedSearch) => {
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
        onSuccess: () => onUpdateSuccess(savedSearch),
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
