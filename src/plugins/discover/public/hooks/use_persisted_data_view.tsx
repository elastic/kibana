/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from './use_discover_services';

let isOpenConfirmPanel = false;

export const usePersistedDataView = (dataView: DataView) => {
  const services = useDiscoverServices();

  const persistDataView = useCallback(async () => {
    try {
      return await services.dataViews.createAndSave({
        id: dataView.id,
        title: dataView.title,
        timeFieldName: dataView.timeFieldName,
      });
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

function showConfirmPanel({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (isOpenConfirmPanel) {
    return;
  }

  isOpenConfirmPanel = true;
  const container = document.createElement('div');
  const onClose = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    isOpenConfirmPanel = false;
  };

  document.body.appendChild(container);
  const element = (
    <EuiConfirmModal
      title={i18n.translate('discover.confirmDataViewPersist.title', {
        defaultMessage: 'Persist data view',
      })}
      onCancel={() => {
        onClose();
        onCancel();
      }}
      onConfirm={() => {
        onClose();
        onConfirm();
      }}
      cancelButtonText="Cancel"
      confirmButtonText="Confirm"
      defaultFocusedButton="confirm"
    >
      <p>
        {i18n.translate('discover.confirmDataViewPersist.message', {
          defaultMessage: 'Persist data view, then proceed.',
        })}
      </p>
    </EuiConfirmModal>
  );
  ReactDOM.render(element, container);
}
