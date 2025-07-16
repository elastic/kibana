/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiText,
  EuiModal,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaContextExtra } from '../../types';

export const OVERRIDE_WARNING_DISMISSED_STORAGE_KEY = 'indexEditor.OverrideWarningDismissed';

interface OverrideWarningModalProps {
  onCancel: () => void;
  onContinue: () => void;
}

export const OverrideWarningModal: React.FC<OverrideWarningModalProps> = ({
  onCancel,
  onContinue,
}) => {
  const [dontAskMeAgainCheck, setDontAskMeAgainCheck] = useState(false);

  const {
    services: { storage },
  } = useKibana<KibanaContextExtra>();

  const continueHandler = () => {
    if (dontAskMeAgainCheck) {
      storage.set(OVERRIDE_WARNING_DISMISSED_STORAGE_KEY, true);
    }
    onContinue();
  };

  return (
    <EuiModal style={{ width: 700 }} onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="indexEditor.overrideWarningModal.title"
            defaultMessage="This action will override the unsaved changes in your table."
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="m">
          <FormattedMessage
            id="indexEditor.overrideWarningModal.body"
            defaultMessage="You have unsaved changes in your table. If you continue, these changes will be lost."
          />
        </EuiText>
        <EuiSpacer size="s" />
      </EuiModalBody>

      <EuiModalFooter css={{ paddingBlockStart: 0 }}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="dismiss-discard-starred-query-modal"
              label={i18n.translate('esqlEditor.discardStarredQueryModal.dismissButtonLabel', {
                defaultMessage: "Don't ask me again",
              })}
              checked={dontAskMeAgainCheck}
              onChange={(e) => setDontAskMeAgainCheck(e.target.checked)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onCancel} color="primary">
                  {i18n.translate('esqlEditor.overrideWarningModal.cancelLabel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={continueHandler}>
                  {i18n.translate('esqlEditor.overrideWarningModal.continue', {
                    defaultMessage: 'Continue',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
