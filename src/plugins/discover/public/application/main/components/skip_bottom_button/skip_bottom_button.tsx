/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import './skip_bottom_button.scss';
import { EuiScreenReaderOnly, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface SkipBottomButtonProps {
  /**
   * Action to perform on click
   */
  onClick: () => void;
}

export function SkipBottomButton({ onClick }: SkipBottomButtonProps) {
  return (
    <EuiScreenReaderOnly showOnFocus>
      <EuiButton
        fill
        size="s"
        onClick={onClick}
        className="dscSkipButton"
        data-test-subj="discoverSkipTableButton"
      >
        <FormattedMessage
          id="discover.skipToBottomButtonLabel"
          defaultMessage="Go to end of table"
        />
      </EuiButton>
    </EuiScreenReaderOnly>
  );
}
