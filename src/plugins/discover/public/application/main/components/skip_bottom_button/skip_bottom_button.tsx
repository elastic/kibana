/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import './skip_bottom_button.scss';
import { EuiSkipLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface SkipBottomButtonProps {
  /**
   * Action to perform on click
   */
  onClick: () => void;
}

export function SkipBottomButton({ onClick }: SkipBottomButtonProps) {
  return (
    <EuiSkipLink
      size="s"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        // prevent the anchor to reload the page on click
        event.preventDefault();
        // The destinationId prop cannot be leveraged here as the table needs
        // to be updated firsts
        onClick();
      }}
      className="dscSkipButton"
      id="dscSkipButton"
      destinationId=""
      data-test-subj="discoverSkipTableButton"
      position="absolute"
    >
      <FormattedMessage id="discover.skipToBottomButtonLabel" defaultMessage="Go to end of table" />
    </EuiSkipLink>
  );
}
