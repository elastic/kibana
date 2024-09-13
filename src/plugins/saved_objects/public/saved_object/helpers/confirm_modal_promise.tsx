/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { CoreStart, OverlayStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';

type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;

export function confirmModalPromise(
  message = '',
  title = '',
  confirmBtnText = '',
  overlays: OverlayStart,
  startServices: StartServices
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
        </EuiConfirmModal>,
        startServices
      )
    );
  });
}
