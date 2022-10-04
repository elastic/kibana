/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

let isOpenConfirmPanel = false;

export const showConfirmPanel = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => {
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
      title={i18n.translate('discover.confirmDataViewSave.title', {
        defaultMessage: 'Save data view',
      })}
      onCancel={() => {
        onClose();
        onCancel();
      }}
      onConfirm={() => {
        onClose();
        onConfirm();
      }}
      cancelButtonText={i18n.translate('discover.confirmDataViewSave.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('discover.confirmDataViewSave.saveAndContinue', {
        defaultMessage: 'Save and continue',
      })}
      defaultFocusedButton="confirm"
    >
      <p>
        {i18n.translate('discover.confirmDataViewSave.message', {
          defaultMessage: 'The action you chose requires a saved data view.',
        })}
      </p>
    </EuiConfirmModal>
  );
  ReactDOM.render(element, container);
};
