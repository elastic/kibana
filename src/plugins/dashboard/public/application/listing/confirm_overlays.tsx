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

import { CoreStart, OverlayStart } from '../../../../../core/public';
import { toMountPoint } from '../../services/kibana_react';
import { createConfirmStrings, discardConfirmStrings } from '../../dashboard_strings';

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

export const confirmCreateWithUnsaved = (
  overlays: OverlayStart,
  theme: CoreStart['theme'],
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
      </EuiFocusTrap>,
      { theme$: theme.theme$ }
    ),
    {
      'data-test-subj': 'dashboardCreateConfirmModal',
    }
  );
};
