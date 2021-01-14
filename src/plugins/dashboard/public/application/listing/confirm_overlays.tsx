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

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EUI_MODAL_CANCEL_BUTTON,
} from '@elastic/eui';
import React from 'react';
import { OverlayStart } from '../../../../../core/public';
import { createConfirmStrings, leaveConfirmStrings } from '../../dashboard_strings';
import { toMountPoint } from '../../services/kibana_react';

export const confirmDiscardUnsavedChanges = (overlays: OverlayStart, discardCallback: () => void) =>
  overlays
    .openConfirm(leaveConfirmStrings.getDiscardSubtitle(), {
      confirmButtonText: leaveConfirmStrings.getConfirmButtonText(),
      cancelButtonText: leaveConfirmStrings.getCancelButtonText(),
      buttonColor: 'danger',
      defaultFocusedButton: EUI_MODAL_CANCEL_BUTTON,
      title: leaveConfirmStrings.getDiscardTitle(),
    })
    .then((isConfirmed) => {
      if (isConfirmed) {
        discardCallback();
      }
    });

export const confirmCreateWithUnsaved = (
  overlays: OverlayStart,
  startBlankCallback: () => void,
  contineCallback: () => void
) => {
  const session = overlays.openModal(
    toMountPoint(
      <EuiModal onClose={() => session.close()}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{createConfirmStrings.getCreateTitle()}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>{createConfirmStrings.getCreateSubtitle()}</EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={() => session.close()}>
            {createConfirmStrings.getCancelButtonText()}
          </EuiButtonEmpty>
          <EuiButtonEmpty
            color="danger"
            onClick={() => {
              startBlankCallback();
              session.close();
            }}
          >
            {createConfirmStrings.getStartOverButtonText()}
          </EuiButtonEmpty>
          <EuiButton
            fill
            onClick={() => {
              contineCallback();
              session.close();
            }}
          >
            {createConfirmStrings.getContinueButtonText()}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    ),
    {
      'data-test-subj': 'dashboardCreateConfirmModal',
    }
  );
};
