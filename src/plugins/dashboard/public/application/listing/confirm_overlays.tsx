/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
} from '@elastic/eui';
import React from 'react';
import { OverlayStart } from '../../../../../core/public';
import { createConfirmStrings, leaveConfirmStrings } from '../../dashboard_strings';
import { toMountPoint } from '../../services/kibana_react';

export const confirmDiscardUnsavedChanges = (
  overlays: OverlayStart,
  options: {
    discardCallback: () => void;
    cancelButtonText?: string;
    keepChangesCallBack?: () => void;
  }
) => {
  const {
    discardCallback,
    cancelButtonText = leaveConfirmStrings.getCancelButtonText(),
    keepChangesCallBack,
  } = options;

  const session = overlays.openModal(
    toMountPoint(
      <EuiModal onClose={() => session.close()}>
        <EuiModalHeader data-test-subj="dashboardDiscardConfirm">
          <EuiModalHeaderTitle>{leaveConfirmStrings.getDiscardTitle()}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>{leaveConfirmStrings.getDiscardSubtitle()}</EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            data-test-subj="dashboardDiscardConfirmCancel"
            onClick={() => session.close()}
          >
            {cancelButtonText}
          </EuiButtonEmpty>
          {keepChangesCallBack ? (
            <EuiButtonEmpty
              data-test-subj="dashboardDiscardConfirmKeepChanges"
              onClick={() => {
                keepChangesCallBack();
                session.close();
              }}
            >
              {leaveConfirmStrings.getKeepChangesButtonText()}
            </EuiButtonEmpty>
          ) : null}
          <EuiButton
            fill
            color="danger"
            data-test-subj="dashboardDiscardConfirmDiscardChanges"
            onClick={() => {
              discardCallback();
              session.close();
            }}
          >
            {leaveConfirmStrings.getConfirmButtonText()}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    ),
    {
      'data-test-subj': 'dashboardCreateConfirmModal',
    }
  );
};
// .openConfirm(leaveConfirmStrings.getDiscardSubtitle(), {
//   confirmButtonText: leaveConfirmStrings.getConfirmButtonText(),
//   cancelButtonText,
//   buttonColor: 'danger',
//   defaultFocusedButton: EUI_MODAL_CANCEL_BUTTON,
//   title: leaveConfirmStrings.getDiscardTitle(),
// }
// )
// .then((isConfirmed) => {
//   if (isConfirmed) {
//     discardCallback();
//   }
// });

export const confirmCreateWithUnsaved = (
  overlays: OverlayStart,
  startBlankCallback: () => void,
  contineCallback: () => void
) => {
  const session = overlays.openModal(
    toMountPoint(
      <EuiModal onClose={() => session.close()}>
        <EuiModalHeader data-test-subj="dashboardCreateConfirm">
          <EuiModalHeaderTitle>{createConfirmStrings.getCreateTitle()}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>{createConfirmStrings.getCreateSubtitle()}</EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            data-test-subj="dashboardCreateConfirmCancel"
            onClick={() => session.close()}
          >
            {createConfirmStrings.getCancelButtonText()}
          </EuiButtonEmpty>
          <EuiButtonEmpty
            color="danger"
            data-test-subj="dashboardCreateConfirmStartOver"
            onClick={() => {
              startBlankCallback();
              session.close();
            }}
          >
            {createConfirmStrings.getStartOverButtonText()}
          </EuiButtonEmpty>
          <EuiButton
            fill
            data-test-subj="dashboardCreateConfirmContinue"
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
