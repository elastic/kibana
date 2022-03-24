/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';

interface FooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
}

const closeButtonLabel = i18n.translate('indexPatternEditor.editor.flyoutCloseButtonLabel', {
  defaultMessage: 'Close',
});

const saveButtonLabel = i18n.translate('indexPatternEditor.editor.flyoutSaveButtonLabel', {
  defaultMessage: 'Create data view',
});

export const Footer = ({ onCancel, onSubmit, submitDisabled }: FooterProps) => {
  return (
    <EuiFlyoutFooter className="indexPatternEditor__footer">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            flush="left"
            onClick={onCancel}
            data-test-subj="closeFlyoutButton"
          >
            {closeButtonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            onClick={onSubmit}
            data-test-subj="saveIndexPatternButton"
            fill
            disabled={submitDisabled}
          >
            {saveButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
