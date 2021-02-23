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
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EUI_MODAL_CANCEL_BUTTON,
} from '@elastic/eui';
import React from 'react';
import { OverlayStart } from '../../../../../core/public';
import {
  createConfirmStrings,
  discardConfirmStrings,
  leaveEditModeConfirmStrings,
} from '../../dashboard_strings';
import { toMountPoint } from '../../services/kibana_react';

export type DiscardOrKeepSelection = 'cancel' | 'discard' | 'keep';

export const confirmDiscardUnsavedChanges = (overlays: OverlayStart, discardCallback: () => void) =>
  overlays
    .openConfirm(discardConfirmStrings.getDiscardSubtitle(), {
      confirmButtonText: discardConfirmStrings.getDiscardConfirmButtonText(),
      cancelButtonText: discardConfirmStrings.getDiscardCancelButtonText(),
      buttonColor: 'danger',
      defaultFocusedButton: EUI_MODAL_CANCEL_BUTTON,
      title: discardConfirmStrings.getDiscardTitle(),
    })
    .then((isConfirmed) => {
      if (isConfirmed) {
        discardCallback();
      }
    });

export const confirmDiscardOrKeepUnsavedChanges = (
  overlays: OverlayStart
): Promise<DiscardOrKeepSelection> => {
  return new Promise((resolve) => {
    const session = overlays.openModal(
      toMountPoint(
        <>
          <EuiModalHeader data-test-subj="dashboardDiscardConfirm">
            <EuiModalHeaderTitle>
              {leaveEditModeConfirmStrings.getLeaveEditModeTitle()}
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText>{leaveEditModeConfirmStrings.getLeaveEditModeSubtitle()}</EuiText>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="dashboardDiscardConfirmCancel"
              onClick={() => session.close()}
            >
              {leaveEditModeConfirmStrings.getLeaveEditModeCancelButtonText()}
            </EuiButtonEmpty>
            <EuiButtonEmpty
              color="danger"
              data-test-subj="dashboardDiscardConfirmDiscard"
              onClick={() => {
                session.close();
                resolve('discard');
              }}
            >
              {leaveEditModeConfirmStrings.getLeaveEditModeDiscardButtonText()}
            </EuiButtonEmpty>
            <EuiButton
              fill
              data-test-subj="dashboardDiscardConfirmKeep"
              onClick={() => {
                session.close();
                resolve('keep');
              }}
            >
              {leaveEditModeConfirmStrings.getLeaveEditModeKeepChangesText()}
            </EuiButton>
          </EuiModalFooter>
        </>
      ),
      {
        'data-test-subj': 'dashboardDiscardConfirmModal',
        maxWidth: 550,
      }
    );
  });
};

export const confirmCreateWithUnsaved = (
  overlays: OverlayStart,
  startBlankCallback: () => void,
  contineCallback: () => void
) => {
  const session = overlays.openModal(
    toMountPoint(
      <>
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
      </>
    ),
    {
      'data-test-subj': 'dashboardCreateConfirmModal',
    }
  );
};
