/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';

import {
  EuiModal,
  EuiModalBody,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import { GuideId } from '../../common/types';
import { apiService } from '../services/api';

interface QuitGuideModalProps {
  closeModal: () => void;
  currentGuide: GuideId;
  notifications: NotificationsSetup;
}

export const QuitGuideModal = ({
  closeModal,
  currentGuide,
  notifications,
}: QuitGuideModalProps) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const deleteGuide = async () => {
    setIsDeleting(true);
    const { error } = await apiService.deleteGuide(currentGuide);

    if (error) {
      setIsDeleting(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('guidedOnboarding.quitGuideModal.errorToastTitle', {
          defaultMessage: 'There was an error quitting the guide. Please try again.',
        }),
      });
    }
    closeModal();
  };

  return (
    <EuiModal
      maxWidth={448}
      aria-label="quitGuideModal"
      onClose={closeModal}
      data-test-subj="quitGuideModal"
    >
      <EuiModalBody>
        <EuiSpacer size="m" />
        <EuiTitle size="m">
          <h2>
            {i18n.translate('guidedOnboarding.quitGuideModal.modalTitle', {
              defaultMessage: 'Quit this setup guide and discard progress?',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            {i18n.translate('guidedOnboarding.quitGuideModal.modalDescription', {
              defaultMessage: 'You can restart anytime, just click Setup guide on the homepage.',
            })}
          </p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal} data-test-subj="cancelQuitGuideButton">
          {i18n.translate('guidedOnboarding.quitGuideModal.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          color="warning"
          isLoading={isDeleting}
          onClick={deleteGuide}
          fill
          data-test-subj="confirmQuitGuideButton"
        >
          {i18n.translate('guidedOnboarding.quitGuideModal.quitButtonLabel', {
            defaultMessage: 'Quit guide',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
