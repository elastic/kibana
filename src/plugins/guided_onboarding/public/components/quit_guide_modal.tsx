/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';

import {
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GuideState } from '@kbn/guided-onboarding';
import { apiService } from '../services/api';

interface QuitGuideModalProps {
  closeModal: () => void;
  currentGuide: GuideState;
  telemetryGuideId: string;
}

export const QuitGuideModal = ({
  closeModal,
  currentGuide,
  telemetryGuideId,
}: QuitGuideModalProps) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const deleteGuide = async () => {
    setIsDeleting(true);
    await apiService.deactivateGuide(currentGuide);
    closeModal();
  };

  return (
    <EuiModal
      aria-label="quitGuideModal"
      data-test-subj="onboarding--quitGuideModal"
      maxWidth={448}
      onClose={closeModal}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('guidedOnboarding.quitGuideModal.modalTitle', {
            defaultMessage: 'Quit this guide?',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          <p>
            {i18n.translate('guidedOnboarding.quitGuideModal.modalDescription', {
              defaultMessage:
                'You can restart anytime by opening the Setup guide from the Help menu.',
            })}
          </p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj={`onboarding--cancelQuitGuideButton--${telemetryGuideId}`}
          onClick={closeModal}
        >
          {i18n.translate('guidedOnboarding.quitGuideModal.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>

        <EuiButton
          // Used for FS tracking and tests
          data-test-subj={`onboarding--quitGuideButton--${telemetryGuideId}`}
          onClick={deleteGuide}
          isLoading={isDeleting}
          fill
          color="warning"
        >
          {i18n.translate('guidedOnboarding.quitGuideModal.quitButtonLabel', {
            defaultMessage: 'Quit guide',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
