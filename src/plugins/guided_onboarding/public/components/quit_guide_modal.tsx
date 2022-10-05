/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';

import { EuiText, EuiConfirmModal } from '@elastic/eui';
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
    <EuiConfirmModal
      maxWidth={448}
      title={i18n.translate('guidedOnboarding.quitGuideModal.modalTitle', {
        defaultMessage: 'Quit this guide and discard progress?',
      })}
      onCancel={closeModal}
      onConfirm={deleteGuide}
      cancelButtonText={i18n.translate('guidedOnboarding.quitGuideModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('guidedOnboarding.quitGuideModal.quitButtonLabel', {
        defaultMessage: 'Quit guide',
      })}
      aria-label="quitGuideModal"
      buttonColor="warning"
      isLoading={isDeleting}
      data-test-subj="quitGuideModal"
    >
      <EuiText>
        <p>
          {i18n.translate('guidedOnboarding.quitGuideModal.modalDescription', {
            defaultMessage:
              'You can restart anytime by opening the Setup guide from the Help menu.',
          })}
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
