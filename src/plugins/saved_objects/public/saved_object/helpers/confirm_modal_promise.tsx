/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { OverlayStart } from '../../../../../core/public/overlays/overlay_service';
import { toMountPoint } from '../../../../kibana_react/public/util/to_mount_point';

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
