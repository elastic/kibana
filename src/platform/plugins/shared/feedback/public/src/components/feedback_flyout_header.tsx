/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

interface Props {
  closeFlyout: () => void;
}

export const FeedbackFlyoutHeader = ({ closeFlyout }: Props) => {
  const { euiTheme } = useEuiTheme();

  const semiBoldTextCss = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const headerCss = css`
    padding-bottom: ${euiTheme.size.l};
  `;

  return (
    <EuiFlexItem css={headerCss} grow={false} data-test-subj="feedbackFlyoutHeader">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.intercepts.feedbackFlyout.title"
                defaultMessage="Feedback"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="feedbackFlyoutCloseButton"
            iconType="cross"
            color="neutral"
            size="xs"
            css={semiBoldTextCss}
            aria-label={i18n.translate('xpack.intercepts.feedbackFlyout.closeButton.ariaLabel', {
              defaultMessage: 'Close flyout',
            })}
            onClick={closeFlyout}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
