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
import { useDiscoverServices } from './use_discover_services';
import { showConfirmPanel } from './show_confirm_panel';

export const usePersistedDataView = (
  updateHocDataViewId: (dataView: DataView) => Promise<DataView>
) => {
  const services = useDiscoverServices();

  const persistDataView: (dataView: DataView) => Promise<DataView> = useCallback(
    async (dataView) => {
      try {
        const updatedDataView = await updateHocDataViewId(dataView);

        const response = await services.dataViews.createAndSave({
          id: updatedDataView.id,
          title: updatedDataView.title,
          timeFieldName: updatedDataView.timeFieldName,
        });

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
    [services.dataViews, services.toastNotifications, updateHocDataViewId]
  );

  const persist: (dataView: DataView) => Promise<false | DataView> = useCallback(
    async (dataView) => {
      return new Promise((resolve) =>
        showConfirmPanel({
          onConfirm: () =>
            persistDataView(dataView)
              .then((createdDataView) => resolve(createdDataView))
              .catch(() => resolve(false)),
          onCancel: () => resolve(false),
        })
      );
    },
    [persistDataView]
  );

  return persist;
};
