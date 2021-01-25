/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { OverlayStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal } from '@elastic/eui';
import { toMountPoint } from '../../../../kibana_react/public';

export function confirmModalPromise(
  message = '',
  title = '',
  confirmBtnText = '',
  overlays: OverlayStart
): Promise<true> {
  return new Promise((resolve, reject) => {
    const cancelButtonText = i18n.translate('savedObjects.confirmModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    });

    const modal = overlays.openModal(
      toMountPoint(
        <EuiConfirmModal
          onCancel={() => {
            modal.close();
            reject();
          }}
          onConfirm={() => {
            modal.close();
            resolve(true);
          }}
          confirmButtonText={confirmBtnText}
          cancelButtonText={cancelButtonText}
          title={title}
        >
          {message}
        </EuiConfirmModal>
      )
    );
  });
}
