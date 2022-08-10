/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';
import { I18nStart } from '@kbn/core/public';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from './use_discover_services';

let isOpenConfirmPanel = false;

export const usePersistedDataView = (dataView: DataView) => {
  const services = useDiscoverServices();

  const getDataViewList = useCallback(async () => {
    return await services.dataViews.getIdsWithTitle();
  }, [services.dataViews]);

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

  const shouldPersistDataView: () => Promise<boolean> = useCallback(async () => {
    const dataViewList = await getDataViewList();
    if (!isHocDataView(dataViewList, dataView)) {
      return true;
    }

    return new Promise((resolve) =>
      showConfirmPanel({
        I18nContext: services.core.i18n.Context,
        onConfirm: () =>
          persistDataView()
            .then(() => resolve(true))
            .catch(() => resolve(false)),
        onCancel: () => resolve(false),
      })
    );
  }, [dataView, getDataViewList, persistDataView, services.core.i18n.Context]);

  return shouldPersistDataView;
};

function isHocDataView(persistedDataViews: DataViewListItem[], checkDataView: DataView) {
  return !persistedDataViews.find((item) => item.id === checkDataView.id);
}

function showConfirmPanel({
  I18nContext,
  onConfirm,
  onCancel,
}: {
  I18nContext: I18nStart['Context'];
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
    <I18nContext>
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="discover.confirmDataViewPersist.title"
            defaultMessage="Persist data view"
          />
        }
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
          <FormattedMessage
            id="discover.confirmDataViewPersist.message"
            defaultMessage="Persist data view, then proceed."
          />
        </p>
      </EuiConfirmModal>
    </I18nContext>
  );
  ReactDOM.render(element, container);
}
