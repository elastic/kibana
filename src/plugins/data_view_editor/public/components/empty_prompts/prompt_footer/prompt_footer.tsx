/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';

const closeButtonLabel = i18n.translate(
  'indexPatternEditor.editor.emptyPrompt.flyoutCloseButtonLabel',
  {
    defaultMessage: 'Close',
  }
);

interface PromptFooterProps {
  onCancel: () => void;
}

export const PromptFooter = ({ onCancel }: PromptFooterProps) => {
  return (
    <EuiFlyoutFooter>
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
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
