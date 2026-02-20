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
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { firstValueFrom } from 'rxjs';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { KibanaContextExtra } from '../../types';

const OVERRIDE_WARNING_MODAL_DISMISSED = 'indexEditor.OverrideWarningDismissed';

interface OverrideWarningModalProps {
  onCancel: () => void;
  onContinue: () => void;
  storage: Storage;
}

export const OverrideWarningModal: React.FC<OverrideWarningModalProps> = ({
  onCancel,
  onContinue,
  storage,
}) => {
  const [dontAskMeAgainCheck, setDontAskMeAgainCheck] = useState(false);

  const modalTitleId = useGeneratedHtmlId();

  const continueHandler = () => {
    if (dontAskMeAgainCheck) {
      storage.set(OVERRIDE_WARNING_MODAL_DISMISSED, true);
    }
    onContinue();
  };

  return (
    <EuiModal aria-labelledby={modalTitleId} css={{ width: 700 }} onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="indexEditor.overrideWarningModal.title"
            defaultMessage="This action will override your data"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="m">
          <FormattedMessage
            id="indexEditor.overrideWarningModal.body"
            defaultMessage="By continuing, you'll lose unsaved changes in your table."
          />
        </EuiText>
        <EuiSpacer size="s" />
      </EuiModalBody>

      <EuiModalFooter css={{ paddingBlockStart: 0 }}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="dismiss-discard-starred-query-modal"
              label={i18n.translate('esqlEditor.overrideWarningModal.dismissButtonLabel', {
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
                  <FormattedMessage
                    id="esqlEditor.overrideWarningModal.cancelLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={continueHandler}>
                  <FormattedMessage
                    id="esqlEditor.overrideWarningModal.continue"
                    defaultMessage="Continue"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const getOverrideConfirmation = async ({
  overlays,
  rendering,
  storage,
  indexUpdateService,
}: KibanaContextExtra): Promise<boolean> => {
  const hasPendingChanges = await firstValueFrom(indexUpdateService.hasUnsavedChanges$);
  const dontAskMeAgainCheck = Boolean(storage.get(OVERRIDE_WARNING_MODAL_DISMISSED));

  return new Promise((resolve) => {
    if (!hasPendingChanges || dontAskMeAgainCheck) {
      resolve(true);
    } else {
      const session = overlays.openModal(
        toMountPoint(
          <OverrideWarningModal
            onCancel={() => {
              resolve(false);
              session.close();
            }}
            onContinue={() => {
              resolve(true);
              session.close();
            }}
            storage={storage}
          />,
          rendering
        )
      );
    }
  });
};
