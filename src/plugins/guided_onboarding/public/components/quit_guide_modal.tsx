/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

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

interface QuitGuideModalProps {
  closeModal: () => void;
}

export const QuitGuideModal = ({ closeModal }: QuitGuideModalProps) => {
  return (
    <EuiModal maxWidth={448} aria-label="quitGuideModal" onClose={closeModal}>
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
        <EuiButtonEmpty onClick={closeModal}>
          {i18n.translate('guidedOnboarding.quitGuideModal.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          color="warning"
          onClick={() => {
            // TODO implement
          }}
          fill
        >
          {i18n.translate('guidedOnboarding.quitGuideModal.quitButtonLabel', {
            defaultMessage: 'Quit guide',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
