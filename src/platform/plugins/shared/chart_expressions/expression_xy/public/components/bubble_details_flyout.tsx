/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BubbleDetail } from '../helpers/bubbles';

interface BubbleDetailsFlyoutProps {
  details: BubbleDetail[];
  onClose: () => void;
}

const copyLabel = i18n.translate('expressionXY.bubbleDetailsFlyout.copyAriaLabel', {
  defaultMessage: 'Copy to clipboard',
});

const CopyableField = ({ label, value }: BubbleDetail) => (
  <>
    <EuiText size="xs" color="subdued">
      <strong>{label}</strong>
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiCode>{value}</EuiCode>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={value}>
          {(copy) => (
            <EuiToolTip content={copyLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="copy"
                onClick={copy}
                aria-label={copyLabel}
                data-test-subj="bubbleDetailsFlyoutCopyButton"
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

export const BubbleDetailsFlyout: React.FC<BubbleDetailsFlyoutProps> = ({ details, onClose }) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'bubbleDetailsFlyoutTitle' });

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      aria-labelledby={flyoutTitleId}
      data-test-subj="bubbleDetailsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            {i18n.translate('expressionXY.bubbleDetailsFlyout.title', {
              defaultMessage: 'Details',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {details.map((detail, index) => (
          <React.Fragment key={`${detail.label}-${index}`}>
            {index > 0 ? <EuiSpacer size="m" /> : null}
            <CopyableField label={detail.label} value={detail.value} />
          </React.Fragment>
        ))}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
