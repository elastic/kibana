/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FEEDBACK_LINK } from '@kbn/esql-utils';
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

export interface ESQLToDataViewTransitionModalProps {
  onClose: (dismissFlag?: boolean, needsSave?: boolean) => void;
}
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function ESQLToDataViewTransitionModal({
  onClose,
}: ESQLToDataViewTransitionModalProps) {
  const [dismissModalChecked, setDismissModalChecked] = useState(false);
  const onTransitionModalDismiss = useCallback((e) => {
    setDismissModalChecked(e.target.checked);
  }, []);

  return (
    <EuiModal
      onClose={() => onClose()}
      style={{ width: 700 }}
      data-test-subj="discover-esql-to-dataview-modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('discover.esqlToDataViewTransitionModal.title', {
            defaultMessage: 'Unsaved changes',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="m">
          {i18n.translate('discover.esqlToDataviewTransitionModalBody', {
            defaultMessage:
              'Switching data views removes the current ES|QL query. Save this search to avoid losing work.',
          })}
        </EuiText>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiLink external href={FEEDBACK_LINK} target="_blank">
              {i18n.translate('discover.esqlToDataViewTransitionModal.feedbackLink', {
                defaultMessage: 'Submit ES|QL feedback',
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
              label={i18n.translate('discover.esqlToDataViewTransitionModal.dismissButtonLabel', {
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
                  onClick={() => onClose(dismissModalChecked, false)}
                  color="danger"
                  iconType="trash"
                  data-test-subj="discover-esql-to-dataview-no-save-btn"
                >
                  {i18n.translate('discover.esqlToDataViewTransitionModal.closeButtonLabel', {
                    defaultMessage: 'Discard and switch',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => onClose(dismissModalChecked, true)}
                  fill
                  color="primary"
                  iconType="save"
                  data-test-subj="discover-esql-to-dataview-save-btn"
                >
                  {i18n.translate('discover.esqlToDataViewTransitionModal.saveButtonLabel', {
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
