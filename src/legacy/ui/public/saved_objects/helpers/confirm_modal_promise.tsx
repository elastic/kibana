/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { OverlayStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal } from '@elastic/eui';
import { toMountPoint } from '../../../../../plugins/kibana_react/public';

export function confirmModalPromise(
  message = '',
  title = '',
  confirmBtnText = '',
  overlays: OverlayStart
): Promise<true> {
  return new Promise((resolve, reject) => {
    const cancelButtonText = i18n.translate(
      'common.ui.savedObjects.confirmModal.cancelButtonLabel',
      {
        defaultMessage: 'Cancel',
      }
    );

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
