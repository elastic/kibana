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
import {
  EuiConfirmModal as ConfirmModal,
  EuiOverlayMask as ModalOverlay,
  EUI_MODAL_CONFIRM_BUTTON as MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';
export function ModalConfirm({
  title = 'Are you sure?',
  show = false,
  message,
  onCancel,
  onConfirm,
  confirmButtonText = 'Yes',
  cancelButtonText = 'No',
}) {
  if (!show) return null;
  return (
    <ModalOverlay>
      <ConfirmModal
        title={title}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={cancelButtonText}
        confirmButtonText={confirmButtonText}
        defaultFocusedButton={MODAL_CONFIRM_BUTTON}
      >
        {message}
      </ConfirmModal>
    </ModalOverlay>
  );
}
