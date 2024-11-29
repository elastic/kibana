/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiCheckbox,
  EuiFlexItem,
  EuiFlexGroup,
  EuiHorizontalRule,
} from '@elastic/eui';

export interface DiscardStarredQueryModalProps {
  onClose: (dismissFlag?: boolean, removeQuery?: boolean) => Promise<void>;
}
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function DiscardStarredQueryModal({ onClose }: DiscardStarredQueryModalProps) {
  const [dismissModalChecked, setDismissModalChecked] = useState(false);
  const onTransitionModalDismiss = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDismissModalChecked(e.target.checked);
  }, []);

  return (
    <EuiModal
      onClose={() => onClose()}
      style={{ width: 700 }}
      data-test-subj="discard-starred-query-modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('esqlEditor.discardStarredQueryModal.title', {
            defaultMessage: 'Discard starred query',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="m">
          {i18n.translate('esqlEditor.discardStarredQueryModal.body', {
            defaultMessage:
              'Removing a starred query will remove it from the list. This has no impact on the recent query history.',
          })}
        </EuiText>
        <EuiHorizontalRule margin="s" />
      </EuiModalBody>
      <EuiModalFooter css={{ paddingBlockStart: 0 }}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="dismiss-discard-starred-query-modal"
              label={i18n.translate('esqlEditor.discardStarredQueryModal.dismissButtonLabel', {
                defaultMessage: "Don't ask me again",
              })}
              checked={dismissModalChecked}
              onChange={onTransitionModalDismiss}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={async () => {
                    await onClose(dismissModalChecked, false);
                  }}
                  color="primary"
                  data-test-subj="esqlEditor-discard-starred-query-cancel-btn"
                >
                  {i18n.translate('esqlEditor.discardStarredQueryModal.cancelLabel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={async () => {
                    await onClose(dismissModalChecked, true);
                  }}
                  color="danger"
                  iconType="trash"
                  data-test-subj="esqlEditor-discard-starred-query-discard-btn"
                >
                  {i18n.translate('esqlEditor.discardStarredQueryModal.discardQueryLabel', {
                    defaultMessage: 'Discard query',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
