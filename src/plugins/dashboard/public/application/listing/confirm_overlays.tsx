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
  EuiFocusTrap,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOutsideClickDetector,
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
  const titleId = 'confirmDiscardOrKeepTitle';
  const descriptionId = 'confirmDiscardOrKeepDescription';

  return new Promise((resolve) => {
    const session = overlays.openModal(
      toMountPoint(
        <EuiFocusTrap clickOutsideDisables={true} initialFocus={'.discardConfirmKeepButton'}>
          <EuiOutsideClickDetector onOutsideClick={() => session.close()}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
            >
              <EuiModalHeader data-test-subj="dashboardDiscardConfirm">
                <EuiModalHeaderTitle>
                  <h2 id={titleId}>{leaveEditModeConfirmStrings.getLeaveEditModeTitle()}</h2>
                </EuiModalHeaderTitle>
              </EuiModalHeader>

              <EuiModalBody>
                <EuiText>
                  <p id={descriptionId}>{leaveEditModeConfirmStrings.getLeaveEditModeSubtitle()}</p>
                </EuiText>
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
                  className="discardConfirmKeepButton"
                  onClick={() => {
                    session.close();
                    resolve('keep');
                  }}
                >
                  {leaveEditModeConfirmStrings.getLeaveEditModeKeepChangesText()}
                </EuiButton>
              </EuiModalFooter>
            </div>
          </EuiOutsideClickDetector>
        </EuiFocusTrap>
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
  const titleId = 'confirmDiscardOrKeepTitle';
  const descriptionId = 'confirmDiscardOrKeepDescription';

  const session = overlays.openModal(
    toMountPoint(
      <EuiFocusTrap
        clickOutsideDisables={true}
        initialFocus={'.dashboardCreateConfirmContinueButton'}
      >
        <EuiOutsideClickDetector onOutsideClick={() => session.close()}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <EuiModalHeader data-test-subj="dashboardCreateConfirm">
              <EuiModalHeaderTitle>
                <h2 id={titleId}>{createConfirmStrings.getCreateTitle()}</h2>
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <EuiText>
                <p id={descriptionId}>{createConfirmStrings.getCreateSubtitle()}</p>
              </EuiText>
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
                className="dashboardCreateConfirmContinueButton"
                onClick={() => {
                  contineCallback();
                  session.close();
                }}
              >
                {createConfirmStrings.getContinueButtonText()}
              </EuiButton>
            </EuiModalFooter>
          </div>
        </EuiOutsideClickDetector>
      </EuiFocusTrap>
    ),
    {
      'data-test-subj': 'dashboardCreateConfirmModal',
    }
  );
};
