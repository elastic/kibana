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

export const usePersistedDataView = (dataView: DataView) => {
  const services = useDiscoverServices();

  const persistDataView = useCallback(async () => {
    try {
      const response = await services.dataViews.createAndSave({
        id: dataView.id,
        title: dataView.title,
        timeFieldName: dataView.timeFieldName,
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
  }, [
    dataView.id,
    dataView.timeFieldName,
    dataView.title,
    services.dataViews,
    services.toastNotifications,
  ]);

  const dataViewPersisted: () => Promise<boolean> = useCallback(async () => {
    if (dataView.isPersisted()) {
      return true;
    }

    return new Promise((resolve) =>
      showConfirmPanel({
        onConfirm: () =>
          persistDataView()
            .then(() => resolve(true))
            .catch(() => resolve(false)),
        onCancel: () => resolve(false),
      })
    );
  }, [dataView, persistDataView]);

  return dataViewPersisted;
};
