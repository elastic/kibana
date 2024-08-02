/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  EuiLink,
  EuiHorizontalRule,
} from '@elastic/eui';

const FEEDBACK_LINK = 'https://ela.st/esql-feedback';

export interface ESQLToDataViewTransitionModalProps {
  closeModal: (dismissFlag?: boolean, needsSave?: boolean) => void;
}
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function ESQLToDataViewTransitionModal({
  closeModal,
}: ESQLToDataViewTransitionModalProps) {
  const [dismissModalChecked, setDismissModalChecked] = useState(false);
  const onTransitionModalDismiss = useCallback((e) => {
    setDismissModalChecked(e.target.checked);
  }, []);

  return (
    <EuiModal
      onClose={() => closeModal()}
      style={{ width: 700 }}
      data-test-subj="discover-esql-to-dataview-modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('discover.esqlToDataviewTransitionModalTitle', {
            defaultMessage: 'Unsaved changes',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="m">
          {i18n.translate('discover.esqlToDataviewTransitionModalBody', {
            defaultMessage:
              "Switching data views removes the current ES|QL query. Save this search to ensure you don't lose work.",
          })}
        </EuiText>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="GrayText">
              {i18n.translate('discover.esqlToDataviewTransitionModalHelpText', {
                defaultMessage: 'Help us improve ES|QL.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink external href={FEEDBACK_LINK} target="_blank">
              {i18n.translate('discover.esqlToDataviewTransitionModalFeedbackLink', {
                defaultMessage: 'Submit feedback',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" />
      </EuiModalBody>
      <EuiModalFooter css={{ paddingBlockStart: 0 }}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="dismiss-text-based-languages-transition-modal"
              label={i18n.translate('discover.esqlToDataviewTransitionModalDismissButton', {
                defaultMessage: "Store response and don't show again",
              })}
              checked={dismissModalChecked}
              onChange={onTransitionModalDismiss}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={() => closeModal(dismissModalChecked, false)}
                  color="danger"
                  iconType="trash"
                  data-test-subj="discover-esql-to-dataview-no-save-btn"
                >
                  {i18n.translate('discover.esqlToDataviewTransitionModalCloseButton', {
                    defaultMessage: 'Discard and switch',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => closeModal(dismissModalChecked, true)}
                  fill
                  color="primary"
                  iconType="save"
                  data-test-subj="discover-esql-to-dataview-save-btn"
                >
                  {i18n.translate('discover.esqlToDataviewTransitionModalSaveButton', {
                    defaultMessage: 'Save and switch',
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
